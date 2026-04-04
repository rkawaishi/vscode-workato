import * as vscode from 'vscode';
import { parsePillPayload, formatPillRef } from '../parsers/pill';

const PILL_REGEX = /#\{_dp\('((?:[^'\\]|\\.)*)'\)\}/g;

const dimDecorationType = vscode.window.createTextEditorDecorationType({
  opacity: '0.3',
});

const hintDecorationType = vscode.window.createTextEditorDecorationType({
  after: {
    color: new vscode.ThemeColor('editorCodeLens.foreground'),
    fontStyle: 'italic',
  },
});

export function activatePillDecorator(context: vscode.ExtensionContext): void {
  // Decorate active editor
  if (vscode.window.activeTextEditor) {
    updateDecorations(vscode.window.activeTextEditor);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDecorations(editor);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && e.document === editor.document) {
        updateDecorations(editor);
      }
    }),
  );
}

function updateDecorations(editor: vscode.TextEditor): void {
  if (!editor.document.uri.fsPath.endsWith('.recipe.json')) {
    return;
  }

  const text = editor.document.getText();
  const dimRanges: vscode.DecorationOptions[] = [];
  const hintRanges: vscode.DecorationOptions[] = [];

  let match: RegExpExecArray | null;
  PILL_REGEX.lastIndex = 0;

  while ((match = PILL_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    const jsonPayload = match[1].replace(/\\'/g, "'");

    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.positionAt(match.index + fullMatch.length);
    const range = new vscode.Range(startPos, endPos);

    const ref = parsePillPayload(jsonPayload);
    if (ref) {
      const readable = formatPillRef(ref);

      // Dim the raw _dp() text
      dimRanges.push({ range });

      // Show readable hint after the dimmed text
      hintRanges.push({
        range,
        renderOptions: {
          after: {
            contentText: ` → ${readable}`,
          },
        },
      });
    }
  }

  editor.setDecorations(dimDecorationType, dimRanges);
  editor.setDecorations(hintDecorationType, hintRanges);
}
