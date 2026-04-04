import * as vscode from 'vscode';
import { RecipeModel, RecipeStep, ResolvedInput } from '../types/workato';

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
      `Recipe: ${recipe.name}`,
      vscode.ViewColumn.Beside,
      { enableScripts: false },
    );

    const instance = new RecipeWebviewPanel(panel, key);
    RecipeWebviewPanel.panels.set(key, instance);
    instance.update(recipe);
  }

  update(recipe: RecipeModel): void {
    this.panel.title = `Recipe: ${recipe.name}`;
    this.panel.webview.html = renderHtml(recipe);
  }

  private dispose(): void {
    RecipeWebviewPanel.panels.delete(this.uri);
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

function renderHtml(recipe: RecipeModel): string {
  const connectionsHtml = recipe.connections.length > 0
    ? `<div class="connections">
        <h3>Connections</h3>
        ${recipe.connections.map(c => `<span class="connection"><span class="provider-badge">${esc(c.provider)}</span> ${esc(c.name)}</span>`).join('')}
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --border: var(--vscode-panel-border, #333);
    --accent: var(--vscode-textLink-foreground, #4fc1ff);
    --muted: var(--vscode-descriptionForeground, #888);
    --card-bg: var(--vscode-editorWidget-background, #1e1e1e);
    --keyword-trigger: #e5c07b;
    --keyword-action: #61afef;
    --keyword-foreach: #c678dd;
    --pill-color: #98c379;
  }
  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--fg);
    background: var(--bg);
    padding: 16px;
    line-height: 1.6;
  }
  h1 { font-size: 1.4em; margin: 0 0 4px 0; }
  h3 { font-size: 1em; margin: 12px 0 6px 0; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .description { color: var(--muted); margin-bottom: 16px; white-space: pre-wrap; }
  .connections { margin-bottom: 16px; }
  .connection {
    display: inline-block;
    padding: 2px 8px;
    margin: 2px 4px 2px 0;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 0.9em;
  }
  .provider-badge {
    font-weight: 600;
    margin-right: 4px;
  }
  .step-tree { margin: 0; padding: 0; }
  .step {
    border-left: 2px solid var(--border);
    margin-left: 12px;
    padding: 8px 0 8px 16px;
    position: relative;
  }
  .step:last-child { border-left-color: transparent; }
  .step::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 16px;
    width: 12px;
    height: 0;
    border-top: 2px solid var(--border);
  }
  .step-root {
    border-left: none;
    margin-left: 0;
    padding-left: 0;
  }
  .step-root::before { display: none; }
  .step-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .keyword {
    font-size: 0.75em;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 3px;
    letter-spacing: 0.05em;
  }
  .keyword-trigger { background: var(--keyword-trigger); color: #1e1e1e; }
  .keyword-action { background: var(--keyword-action); color: #1e1e1e; }
  .keyword-foreach { background: var(--keyword-foreach); color: #1e1e1e; }
  .step-name { font-weight: 600; }
  .step-alias { color: var(--muted); font-size: 0.85em; font-family: monospace; }
  .step-provider { color: var(--muted); font-size: 0.9em; }
  .step-comment { color: var(--muted); font-style: italic; margin: 2px 0; }
  .inputs { margin: 4px 0 0 0; }
  .input-row {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 0.9em;
    padding: 1px 0;
  }
  .input-key { color: var(--accent); }
  .input-arrow { color: var(--muted); margin: 0 4px; }
  .pill-ref { color: var(--pill-color); }
  .foreach-source { margin: 4px 0; font-size: 0.9em; }
  .foreach-label { color: var(--keyword-foreach); font-weight: 600; }
</style>
</head>
<body>
  <h1>${esc(recipe.name)}</h1>
  ${recipe.description ? `<div class="description">${esc(recipe.description)}</div>` : ''}
  ${connectionsHtml}
  <h3>Flow</h3>
  <div class="step-tree">
    ${renderStep(recipe.trigger, true)}
  </div>
</body>
</html>`;
}

function renderStep(step: RecipeStep, isRoot = false): string {
  const keywordClass = `keyword-${step.keyword === 'trigger' ? 'trigger' : step.keyword === 'foreach' ? 'foreach' : 'action'}`;
  const providerLabel = step.provider ? `<span class="step-provider">${esc(step.provider)} /</span>` : '';
  const aliasLabel = step.alias ? `<span class="step-alias">[${esc(step.alias)}]</span>` : '';

  const commentHtml = step.comment
    ? `<div class="step-comment">${esc(step.comment)}</div>`
    : '';

  const sourceHtml = step.source
    ? `<div class="foreach-source"><span class="foreach-label">Source:</span> ${renderInputValue(step.source)}</div>`
    : '';

  const inputsHtml = step.inputs.length > 0
    ? `<div class="inputs">${step.inputs.map(renderInputRow).join('')}</div>`
    : '';

  const childrenHtml = step.children.map(c => renderStep(c)).join('');

  return `<div class="step ${isRoot ? 'step-root' : ''}">
    <div class="step-header">
      <span class="keyword ${keywordClass}">${esc(step.keyword)}</span>
      ${providerLabel}
      <span class="step-name">${esc(step.name)}</span>
      ${aliasLabel}
    </div>
    ${commentHtml}
    ${sourceHtml}
    ${inputsHtml}
    ${childrenHtml}
  </div>`;
}

function renderInputRow(input: ResolvedInput): string {
  return `<div class="input-row">
    <span class="input-key">${esc(input.key)}</span>
    <span class="input-arrow">&larr;</span>
    ${renderInputValue(input)}
  </div>`;
}

function renderInputValue(input: ResolvedInput): string {
  if (input.references.length > 0) {
    // Highlight pill references in the display value
    let html = esc(input.displayValue);
    for (const ref of input.references) {
      const refText = `[${ref.stepAlias}]`;
      html = html.replace(
        esc(refText),
        `<span class="pill-ref">${esc(refText)}</span>`,
      );
    }
    return html;
  }
  return `<span>${esc(input.displayValue)}</span>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
