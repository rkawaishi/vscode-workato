import * as vscode from 'vscode';

const KEYWORD_REGEX = /"keyword"\s*:\s*"(trigger|action|foreach|try|catch)"/g;
const PROVIDER_REGEX = /"provider"\s*:\s*"([^"]+)"/;
const NAME_REGEX = /"name"\s*:\s*"([^"]+)"/;
const MNEMONIC_REGEX = /"mnemonic"\s*:\s*"([^"]+)"/;
const COMMENT_REGEX = /"comment"\s*:\s*"([^"]+)"/;
const NUMBER_REGEX = /"number"\s*:\s*(\d+)/;

// Decoration types for each step kind — background + bold label
const triggerDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: 'rgba(229, 192, 123, 0.15)',
  overviewRulerColor: '#e5c07b',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  before: {
    color: '#e5c07b',
    fontWeight: 'bold',
  },
});

const actionDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: 'rgba(97, 175, 239, 0.12)',
  overviewRulerColor: '#61afef',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  before: {
    color: '#61afef',
    fontWeight: 'bold',
  },
});

const foreachDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: 'rgba(198, 120, 221, 0.12)',
  overviewRulerColor: '#c678dd',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  before: {
    color: '#c678dd',
    fontWeight: 'bold',
  },
});

const tryDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: 'rgba(86, 182, 194, 0.12)',
  overviewRulerColor: '#56b6c2',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  before: {
    color: '#56b6c2',
    fontWeight: 'bold',
  },
});

const catchDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: 'rgba(224, 108, 117, 0.12)',
  overviewRulerColor: '#e06c75',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  before: {
    color: '#e06c75',
    fontWeight: 'bold',
  },
});

export function activateStepCodeLens(context: vscode.ExtensionContext): void {
  if (vscode.window.activeTextEditor) {
    updateStepDecorations(vscode.window.activeTextEditor);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateStepDecorations(editor);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && e.document === editor.document) {
        updateStepDecorations(editor);
      }
    }),
  );
}

function updateStepDecorations(editor: vscode.TextEditor): void {
  if (!editor.document.uri.fsPath.endsWith('.recipe.json')) {
    editor.setDecorations(triggerDecorationType, []);
    editor.setDecorations(actionDecorationType, []);
    editor.setDecorations(foreachDecorationType, []);
    editor.setDecorations(tryDecorationType, []);
    editor.setDecorations(catchDecorationType, []);
    return;
  }

  const text = editor.document.getText();
  const braceMap = buildBraceMap(text);

  const triggerDecos: vscode.DecorationOptions[] = [];
  const actionDecos: vscode.DecorationOptions[] = [];
  const foreachDecos: vscode.DecorationOptions[] = [];
  const tryDecos: vscode.DecorationOptions[] = [];
  const catchDecos: vscode.DecorationOptions[] = [];

  let match: RegExpExecArray | null;
  KEYWORD_REGEX.lastIndex = 0;

  while ((match = KEYWORD_REGEX.exec(text)) !== null) {
    const keyword = match[1];
    const braceOffset = braceMap.get(match.index - 1);
    if (braceOffset === undefined) {
      continue;
    }

    const blockText = text.substring(braceOffset, Math.min(text.length, match.index + 500));

    const provider = PROVIDER_REGEX.exec(blockText)?.[1] || '';
    const mnemonic = MNEMONIC_REGEX.exec(blockText)?.[1];
    const name = NAME_REGEX.exec(blockText)?.[1] || '';
    const comment = COMMENT_REGEX.exec(blockText)?.[1] || '';
    const number = NUMBER_REGEX.exec(blockText)?.[1];

    const displayName = mnemonic || name;

    let label: string;
    if (keyword === 'trigger') {
      label = `⚡ TRIGGER: ${provider} / ${displayName}`;
    } else if (keyword === 'foreach') {
      label = `🔄 LOOP (Step ${number ?? '?'})`;
    } else if (keyword === 'try') {
      label = `🛡 TRY`;
    } else if (keyword === 'catch') {
      label = `🚨 CATCH`;
    } else {
      label = `▶ Step ${number ?? '?'}: ${provider} / ${displayName}`;
    }

    if (comment) {
      label += `  — ${comment}`;
    }

    const braceLine = editor.document.positionAt(braceOffset).line;
    const range = new vscode.Range(braceLine, 0, braceLine, 0);

    const deco: vscode.DecorationOptions = {
      range,
      renderOptions: {
        before: {
          contentText: `  ${label}  `,
          margin: '0 8px 0 0',
        },
      },
    };

    if (keyword === 'trigger') {
      triggerDecos.push(deco);
    } else if (keyword === 'foreach') {
      foreachDecos.push(deco);
    } else if (keyword === 'try') {
      tryDecos.push(deco);
    } else if (keyword === 'catch') {
      catchDecos.push(deco);
    } else {
      actionDecos.push(deco);
    }
  }

  editor.setDecorations(triggerDecorationType, triggerDecos);
  editor.setDecorations(actionDecorationType, actionDecos);
  editor.setDecorations(foreachDecorationType, foreachDecos);
  editor.setDecorations(tryDecorationType, tryDecos);
  editor.setDecorations(catchDecorationType, catchDecos);
}

function buildBraceMap(text: string): Map<number, number> {
  const map = new Map<number, number>();
  const braceStack: number[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
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

    if (ch === '{') {
      braceStack.push(i);
    } else if (ch === '}') {
      braceStack.pop();
    }

    if (braceStack.length > 0) {
      map.set(i, braceStack[braceStack.length - 1]);
    }
  }

  return map;
}
