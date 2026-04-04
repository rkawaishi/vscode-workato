import * as vscode from 'vscode';
import { parseRecipe } from './parsers/recipe';
import { RecipeWebviewPanel } from './views/recipeWebview';
import { RawRecipe } from './types/workato';

export function activate(context: vscode.ExtensionContext): void {
  const command = vscode.commands.registerCommand(
    'workato.openReadableView',
    () => openReadableView(),
  );

  // Auto-open readable view when a .recipe.json file is opened
  const onDidOpen = vscode.workspace.onDidOpenTextDocument((doc) => {
    if (doc.uri.fsPath.endsWith('.recipe.json')) {
      // Small delay to let the editor become active
      setTimeout(() => openReadableView(), 300);
    }
  });

  // Also handle already-open editors at activation time
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document.uri.fsPath.endsWith('.recipe.json')) {
    setTimeout(() => openReadableView(), 300);
  }

  context.subscriptions.push(command, onDidOpen);
}

async function openReadableView(): Promise<void> {
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

export function deactivate(): void {
  // nothing to clean up
}
