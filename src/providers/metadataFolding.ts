import * as vscode from 'vscode';

// Keys whose values should be foldable (and auto-folded)
const FOLDABLE_KEYS = [
  'extended_output_schema',
  'extended_input_schema',
  'visible_config_fields',
  'job_report_schema',
  'job_report_config',
  'toggleCfg',
  'dynamicPickListSelection',
];

const KEY_PATTERN = new RegExp(
  `"(${FOLDABLE_KEYS.join('|')})"\\s*:`,
);

class RecipeMetadataFoldingProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    if (!document.uri.fsPath.endsWith('.recipe.json')) {
      return [];
    }

    const ranges: vscode.FoldingRange[] = [];
    const text = document.getText();

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (!KEY_PATTERN.test(line.text)) {
        continue;
      }

      // Find the start of the value ([ or {)
      const colonIdx = text.indexOf(':', document.offsetAt(line.range.start) + line.text.indexOf(':'));
      const afterColon = text.substring(colonIdx + 1).trimStart();
      const opener = afterColon[0];

      if (opener !== '[' && opener !== '{') {
        continue;
      }

      const openerOffset = text.indexOf(opener, colonIdx + 1);
      const closerOffset = findMatchingBracket(text, openerOffset, opener);

      if (closerOffset === -1) {
        continue;
      }

      const startLine = document.positionAt(openerOffset).line;
      const endLine = document.positionAt(closerOffset).line;

      if (endLine > startLine) {
        ranges.push(new vscode.FoldingRange(startLine, endLine));
      }
    }

    return ranges;
  }
}

function findMatchingBracket(text: string, start: number, opener: string): number {
  const closer = opener === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === opener) {
      depth++;
    } else if (ch === closer) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

export function activateMetadataFolding(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider(
      { pattern: '**/*.recipe.json' },
      new RecipeMetadataFoldingProvider(),
    ),
  );

  // Auto-fold metadata sections when a recipe file is opened
  const autoFold = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor?.document.uri.fsPath.endsWith('.recipe.json')) {
      const capturedEditor = editor;
      setTimeout(() => foldMetadataSections(capturedEditor), 500);
    }
  });

  // Also fold for already-open editor
  const currentEditor = vscode.window.activeTextEditor;
  if (currentEditor?.document.uri.fsPath.endsWith('.recipe.json')) {
    setTimeout(() => foldMetadataSections(currentEditor), 500);
  }

  context.subscriptions.push(autoFold);
}

async function foldMetadataSections(editor: vscode.TextEditor): Promise<void> {
  const document = editor.document;
  const text = document.getText();

  for (const key of FOLDABLE_KEYS) {
    const pattern = new RegExp(`"${key}"\\s*:`);
    let searchFrom = 0;

    while (searchFrom < text.length) {
      const match = pattern.exec(text.substring(searchFrom));
      if (!match) {
        break;
      }

      const matchOffset = searchFrom + match.index;
      const line = document.positionAt(matchOffset).line;

      // Use VS Code's built-in fold command at this line
      await vscode.commands.executeCommand('editor.fold', {
        selectionLines: [line],
        levels: 1,
      });

      searchFrom = matchOffset + match[0].length;
    }
  }
}
