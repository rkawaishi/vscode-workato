import * as vscode from 'vscode';
import { parseRecipe } from './parsers/recipe';
import { RecipeWebviewPanel } from './views/recipeWebview';
import { RawRecipe } from './types/workato';
import { activatePillDecorator } from './providers/pillDecorator';
import { activateStepCodeLens } from './providers/stepCodeLens';
import { activateMetadataFolding } from './providers/metadataFolding';

export function activate(context: vscode.ExtensionContext): void {
  // Register inline enhancements for .recipe.json files
  activatePillDecorator(context);
  activateStepCodeLens(context);
  activateMetadataFolding(context);

  // Manual command to open readable view
  const command = vscode.commands.registerCommand(
    'workato.openReadableView',
    () => openReadableViewManual(),
  );

  // Auto-open readable view when a .recipe.json file is opened
  const onDidOpen = vscode.workspace.onDidOpenTextDocument((doc) => {
    if (doc.uri.fsPath.endsWith('.recipe.json')) {
      const targetUri = doc.uri;
      setTimeout(() => openReadableViewForUri(targetUri), 300);
    }
  });

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document.uri.fsPath.endsWith('.recipe.json')) {
    const targetUri = activeEditor.document.uri;
    setTimeout(() => openReadableViewForUri(targetUri), 300);
  }

  context.subscriptions.push(command, onDidOpen);
}

async function openReadableViewManual(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor. Open a .recipe.json file first.');
    return;
  }

  const uri = editor.document.uri;
  if (!uri.fsPath.endsWith('.recipe.json')) {
    vscode.window.showWarningMessage('This command works only on .recipe.json files.');
    return;
  }

  try {
    const text = editor.document.getText();
    const raw: RawRecipe = JSON.parse(text);
    const recipe = parseRecipe(raw);
    RecipeWebviewPanel.show(recipe, uri);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    vscode.window.showErrorMessage(`Failed to parse recipe: ${message}`);
  }
}

async function openReadableViewForUri(uri: vscode.Uri): Promise<void> {
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const raw: RawRecipe = JSON.parse(doc.getText());
    const recipe = parseRecipe(raw);
    RecipeWebviewPanel.show(recipe, uri);
  } catch {
    // Silently ignore parse errors for auto-open
  }
}

export function deactivate(): void {
  // nothing to clean up
}
