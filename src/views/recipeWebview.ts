import * as vscode from 'vscode';
import { RecipeModel, RecipeStep } from '../types/workato';

export class RecipeWebviewPanel {
  private static panels = new Map<string, RecipeWebviewPanel>();
  private readonly panel: vscode.WebviewPanel;
  private readonly uri: string;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, uri: string) {
    this.panel = panel;
    this.uri = uri;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static show(recipe: RecipeModel, documentUri: vscode.Uri): void {
    const key = documentUri.toString();
    const existing = RecipeWebviewPanel.panels.get(key);

    if (existing) {
      existing.panel.reveal(vscode.ViewColumn.Beside);
      existing.update(recipe);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'workatoRecipeView',
      `${recipe.name}`,
      vscode.ViewColumn.Beside,
      { enableScripts: false },
    );

    const instance = new RecipeWebviewPanel(panel, key);
    RecipeWebviewPanel.panels.set(key, instance);
    instance.update(recipe);
  }

  update(recipe: RecipeModel): void {
    this.panel.title = recipe.name;
    this.panel.webview.html = renderHtml(recipe);
  }

  private dispose(): void {
    RecipeWebviewPanel.panels.delete(this.uri);
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

// Colors matching stepCodeLens decoration types
const COLORS: Record<string, { bg: string; fg: string }> = {
  trigger: { bg: 'rgba(229, 192, 123, 0.7)', fg: '#e5c07b' },
  action:  { bg: 'rgba(97, 175, 239, 0.6)',  fg: '#61afef' },
  foreach: { bg: 'rgba(198, 120, 221, 0.6)', fg: '#c678dd' },
  try:     { bg: 'rgba(86, 182, 194, 0.6)',  fg: '#56b6c2' },
  catch:   { bg: 'rgba(224, 108, 117, 0.6)', fg: '#e06c75' },
};

function renderHtml(recipe: RecipeModel): string {
  const connections = recipe.connections
    .map(c => `<span class="tag">${esc(c.provider)}: ${esc(c.name)}</span>`)
    .join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: var(--vscode-font-family, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-editor-foreground);
    background: var(--vscode-editor-background);
    padding: 16px;
    line-height: 1.5;
  }
  h1 { font-size: 1.3em; margin: 0 0 8px 0; }
  .desc { color: var(--vscode-descriptionForeground); margin-bottom: 12px; white-space: pre-wrap; }
  .connections { margin-bottom: 16px; }
  .tag {
    display: inline-block;
    font-size: 0.85em;
    padding: 1px 6px;
    border: 1px solid var(--vscode-panel-border, #444);
    border-radius: 3px;
    margin-right: 4px;
  }
  .flow { list-style: none; padding: 0; margin: 0; }
  .flow li {
    position: relative;
    padding: 6px 8px 6px 24px;
    border-left: 2px solid var(--vscode-panel-border, #444);
    margin-left: 8px;
    border-radius: 3px;
    margin-bottom: 2px;
  }
  .flow li:last-child { border-left-color: transparent; }
  .flow li::before {
    content: '';
    position: absolute;
    left: -2px; top: 14px;
    width: 16px;
    border-top: 2px solid var(--vscode-panel-border, #444);
  }
  .step-label {
    font-size: 0.7em;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    margin-right: 6px;
    display: inline-block;
  }
  .step-num {
    font-size: 0.8em;
    font-weight: 700;
    margin-right: 4px;
  }
  .comment { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
  .nested { margin-top: 4px; }
</style>
</head>
<body>
  <h1>${esc(recipe.name)}</h1>
  ${recipe.description ? `<div class="desc">${esc(recipe.description)}</div>` : ''}
  ${connections ? `<div class="connections">${connections}</div>` : ''}
  <ul class="flow">
    ${renderStep(recipe.trigger)}
  </ul>
</body>
</html>`;
}

function renderStep(step: RecipeStep): string {
  const kw = step.keyword;
  const color = COLORS[kw] || COLORS.action;
  const label = step.provider ? `${step.provider} / ${step.name}` : step.name;
  const comment = step.comment ? ` <span class="comment">— ${esc(step.comment)}</span>` : '';

  let icon: string;
  let kwLabel: string;
  if (kw === 'trigger') {
    icon = '⚡';
    kwLabel = 'TRIGGER';
  } else if (kw === 'foreach') {
    icon = '🔄';
    kwLabel = 'LOOP';
  } else if (kw === 'try') {
    icon = '🛡';
    kwLabel = 'TRY';
  } else if (kw === 'catch') {
    icon = '🚨';
    kwLabel = 'CATCH';
  } else {
    icon = '▶';
    kwLabel = 'ACTION';
  }

  const stepNum = `<span class="step-num" style="color:${color.fg}">Step ${step.number}</span>`;

  const children = step.children.length > 0
    ? `<ul class="flow nested">${step.children.map(c => renderStep(c)).join('')}</ul>`
    : '';

  return `<li style="background:${color.bg}">
    <span class="step-label" style="background:${color.fg}; color:#1e1e1e;">${icon} ${kwLabel}</span>
    ${stepNum}
    <strong>${esc(label)}</strong>${comment}
    ${children}
  </li>`;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
