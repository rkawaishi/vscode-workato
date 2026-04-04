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
    padding: 6px 0 6px 24px;
    border-left: 2px solid var(--vscode-panel-border, #444);
    margin-left: 8px;
  }
  .flow li:last-child { border-left-color: transparent; }
  .flow li::before {
    content: '';
    position: absolute;
    left: -2px; top: 14px;
    width: 16px;
    border-top: 2px solid var(--vscode-panel-border, #444);
  }
  .kw { font-size: 0.7em; font-weight: 700; text-transform: uppercase; padding: 1px 5px; border-radius: 3px; margin-right: 6px; }
  .kw-trigger { background: #e5c07b; color: #1e1e1e; }
  .kw-action { background: #61afef; color: #1e1e1e; }
  .kw-foreach { background: #c678dd; color: #1e1e1e; }
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
  const kwClass = step.keyword === 'trigger' ? 'kw-trigger' : step.keyword === 'foreach' ? 'kw-foreach' : 'kw-action';
  const label = step.provider ? `${step.provider} / ${step.name}` : step.name;
  const comment = step.comment ? ` <span class="comment">— ${esc(step.comment)}</span>` : '';

  const children = step.children.length > 0
    ? `<ul class="flow nested">${step.children.map(c => renderStep(c)).join('')}</ul>`
    : '';

  return `<li>
    <span class="kw ${kwClass}">${esc(step.keyword)}</span>
    <strong>${esc(label)}</strong>${comment}
    ${children}
  </li>`;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
