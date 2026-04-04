import * as vscode from 'vscode';
import { parsePillPayload, formatPillRef } from '../parsers/pill';
import { PillRef } from '../types/workato';

const PILL_REGEX = /#\{_dp\('((?:[^'\\]|\\.)*)'\)\}/g;

// Hide the raw _dp() text by collapsing it to zero width
const hideDecorationType = vscode.window.createTextEditorDecorationType({
  textDecoration: 'none; font-size: 0;',
});

// Show the readable reference as replacement
const replaceDecorationType = vscode.window.createTextEditorDecorationType({});

interface PillLocation {
  range: vscode.Range;
  ref: PillRef;
  raw: string;
}

// Shared state for hover provider
let currentPills: PillLocation[] = [];

export function activatePillDecorator(context: vscode.ExtensionContext): void {
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
    // Hover provider: show original _dp() content on hover
    vscode.languages.registerHoverProvider(
      { pattern: '**/*.recipe.json' },
      {
        provideHover(document, position) {
          for (const pill of currentPills) {
            if (pill.range.contains(position)) {
              const readable = formatPillRef(pill.ref);
              const md = new vscode.MarkdownString();
              md.appendMarkdown(`**${readable}**\n\n`);
              md.appendMarkdown(`- **Provider:** \`${pill.ref.provider}\`\n`);
              md.appendMarkdown(`- **Step:** \`${pill.ref.stepAlias}\`\n`);
              md.appendMarkdown(`- **Path:** \`${pill.ref.path.join('.')}\`\n\n`);
              md.appendMarkdown('---\n');
              md.appendCodeblock(pill.raw, 'json');
              return new vscode.Hover(md, pill.range);
            }
          }
          return null;
        },
      },
    ),
  );
}

function updateDecorations(editor: vscode.TextEditor): void {
  if (!editor.document.uri.fsPath.endsWith('.recipe.json')) {
    currentPills = [];
    return;
  }

  const text = editor.document.getText();
  const hideRanges: vscode.DecorationOptions[] = [];
  const replaceRanges: vscode.DecorationOptions[] = [];
  const pills: PillLocation[] = [];

  let match: RegExpExecArray | null;
  PILL_REGEX.lastIndex = 0;

  while ((match = PILL_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    let jsonPayload: string;
    try {
      jsonPayload = JSON.parse(`"${match[1]}"`);
    } catch {
      continue;
    }

    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.positionAt(match.index + fullMatch.length);
    const range = new vscode.Range(startPos, endPos);

    const ref = parsePillPayload(jsonPayload);
    if (ref) {
      const readable = formatPillRef(ref);

      pills.push({ range, ref, raw: fullMatch });

      // Hide the raw _dp() text
      hideRanges.push({ range });

      // Show readable reference as after-text on the range
      replaceRanges.push({
        range,
        renderOptions: {
          after: {
            contentText: readable,
            color: new vscode.ThemeColor('textLink.foreground'),
            fontStyle: 'normal',
          },
        },
      });
    }
  }

  currentPills = pills;
  editor.setDecorations(hideDecorationType, hideRanges);
  editor.setDecorations(replaceDecorationType, replaceRanges);
}
