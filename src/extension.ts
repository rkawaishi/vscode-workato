import * as vscode from 'vscode';
import { parseRecipe } from './parsers/recipe';
import { RecipeWebviewPanel } from './views/recipeWebview';
import { RawRecipe } from './types/workato';
import { activatePillDecorator } from './providers/pillDecorator';
import { activateStepCodeLens } from './providers/stepCodeLens';
import { activateMetadataFolding } from './providers/metadataFolding';
import { activateCodeDecorator } from './providers/codeDecorator';

export function activate(context: vscode.ExtensionContext): void {
  // Register inline enhancements for .recipe.json files
  activatePillDecorator(context);
  activateStepCodeLens(context);
  activateMetadataFolding(context);
  activateCodeDecorator(context);

  // Open readable view via editor title button or command palette
  const command = vscode.commands.registerCommand(
    'workato.openReadableView',
    () => openReadableView(),
  );

  context.subscriptions.push(command);
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
