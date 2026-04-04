import * as vscode from 'vscode';

// Match "code": "..." where the value is a long string (likely embedded code)
const CODE_KEY_REGEX = /"code"\s*:\s*"/g;

// Hide the raw one-liner code value
const hideCodeDecorationType = vscode.window.createTextEditorDecorationType({
  textDecoration: 'none; font-size: 0;',
});

// Show a clickable label as replacement
const codeLabelDecorationType = vscode.window.createTextEditorDecorationType({});

interface CodeLocation {
  range: vscode.Range;
  code: string;
}

let currentCodeLocations: CodeLocation[] = [];

export function activateCodeDecorator(context: vscode.ExtensionContext): void {
  if (vscode.window.activeTextEditor) {
    updateCodeDecorations(vscode.window.activeTextEditor);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateCodeDecorations(editor);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && e.document === editor.document) {
        updateCodeDecorations(editor);
      }
    }),
    // Hover provider: show formatted code on hover
    vscode.languages.registerHoverProvider(
      { pattern: '**/*.recipe.json' },
      {
        provideHover(_document, position) {
          for (const loc of currentCodeLocations) {
            if (loc.range.contains(position)) {
              const md = new vscode.MarkdownString();
              md.appendMarkdown('**Embedded Code**\n\n');
              md.appendCodeblock(loc.code, 'ruby');
              return new vscode.Hover(md, loc.range);
            }
          }
          return null;
        },
      },
    ),
  );
}

function updateCodeDecorations(editor: vscode.TextEditor): void {
  if (!editor.document.uri.fsPath.endsWith('.recipe.json')) {
    currentCodeLocations = [];
    editor.setDecorations(hideCodeDecorationType, []);
    editor.setDecorations(codeLabelDecorationType, []);
    return;
  }

  const text = editor.document.getText();
  const hideRanges: vscode.DecorationOptions[] = [];
  const labelRanges: vscode.DecorationOptions[] = [];
  const locations: CodeLocation[] = [];

  let match: RegExpExecArray | null;
  CODE_KEY_REGEX.lastIndex = 0;

  while ((match = CODE_KEY_REGEX.exec(text)) !== null) {
    // Position is right after "code": " — find the closing quote of the value
    const valueStart = match.index + match[0].length;
    const valueEnd = findStringEnd(text, valueStart);
    if (valueEnd === -1) {
      continue;
    }

    const rawValue = text.substring(valueStart, valueEnd);

    // Only treat as embedded code if it contains newlines (multi-line code)
    if (!rawValue.includes('\\n')) {
      continue;
    }

    // Unescape JSON string to get the actual code
    let code: string;
    try {
      code = JSON.parse(`"${rawValue}"`);
    } catch {
      continue;
    }

    const lines = code.split('\n');
    const lineCount = lines.length;
    const preview = lines[0].substring(0, 40) + (lines[0].length > 40 ? '...' : '');

    // Range covers the string value (between the quotes)
    const startPos = editor.document.positionAt(valueStart);
    const endPos = editor.document.positionAt(valueEnd);
    const range = new vscode.Range(startPos, endPos);

    locations.push({ range, code });

    // Hide the raw one-liner
    hideRanges.push({ range });

    // Show a summary label
    labelRanges.push({
      range,
      renderOptions: {
        after: {
          contentText: `${preview}  (${lineCount} lines — hover to view)`,
          color: new vscode.ThemeColor('textLink.foreground'),
          fontStyle: 'italic',
        },
      },
    });
  }

  currentCodeLocations = locations;
  editor.setDecorations(hideCodeDecorationType, hideRanges);
  editor.setDecorations(codeLabelDecorationType, labelRanges);
}

/**
 * Find the end of a JSON string value starting at the given offset
 * (the offset should be right after the opening quote).
 * Returns the offset of the character before the closing quote, or -1.
 */
function findStringEnd(text: string, start: number): number {
  let escape = false;
  for (let i = start; i < text.length; i++) {
    if (escape) {
      escape = false;
      continue;
    }
    if (text[i] === '\\') {
      escape = true;
      continue;
    }
    if (text[i] === '"') {
      return i;
    }
  }
  return -1;
}
