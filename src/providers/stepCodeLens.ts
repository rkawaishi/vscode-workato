import * as vscode from 'vscode';

const KEYWORD_REGEX = /"keyword"\s*:\s*"(trigger|action|foreach)"/g;
const PROVIDER_REGEX = /"provider"\s*:\s*"([^"]+)"/;
const NAME_REGEX = /"name"\s*:\s*"([^"]+)"/;
const MNEMONIC_REGEX = /"mnemonic"\s*:\s*"([^"]+)"/;
const COMMENT_REGEX = /"comment"\s*:\s*"([^"]+)"/;
const NUMBER_REGEX = /"number"\s*:\s*(\d+)/;

class RecipeStepCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!document.uri.fsPath.endsWith('.recipe.json')) {
      return [];
    }

    const text = document.getText();

    // Pass 1: build a brace stack map — for each offset, track enclosing { offset
    const braceMap = buildBraceMap(text);

    // Pass 2: find "keyword" matches and look up their enclosing {
    const lenses: vscode.CodeLens[] = [];
    let match: RegExpExecArray | null;
    KEYWORD_REGEX.lastIndex = 0;

    while ((match = KEYWORD_REGEX.exec(text)) !== null) {
      const keyword = match[1];
      // match.index is at the opening " which is a string delimiter,
      // so look up the character just before it (whitespace/newline)
      const braceOffset = braceMap.get(match.index - 1);
      if (braceOffset === undefined) {
        continue;
      }

      // Extract text from the brace for metadata search
      const blockText = text.substring(braceOffset, Math.min(text.length, match.index + 500));

      const provider = PROVIDER_REGEX.exec(blockText)?.[1] || '';
      const mnemonic = MNEMONIC_REGEX.exec(blockText)?.[1];
      const name = NAME_REGEX.exec(blockText)?.[1] || '';
      const comment = COMMENT_REGEX.exec(blockText)?.[1] || '';
      const number = NUMBER_REGEX.exec(blockText)?.[1];

      const displayName = mnemonic || name;

      let label: string;
      if (keyword === 'trigger') {
        label = `━━━ ⚡ TRIGGER: ${provider} / ${displayName} ━━━`;
      } else if (keyword === 'foreach') {
        label = `━━━ 🔄 LOOP (Step ${number ?? '?'}) ━━━`;
      } else {
        label = `━━━ Step ${number ?? '?'}: ${provider} / ${displayName} ━━━`;
      }

      if (comment) {
        label += `  « ${comment} »`;
      }

      const bracePos = document.positionAt(braceOffset);
      const range = new vscode.Range(bracePos, bracePos);
      lenses.push(new vscode.CodeLens(range, {
        title: label,
        command: '',
      }));
    }

    return lenses;
  }
}

/**
 * Forward-scan through JSON text to build a map from character offsets
 * to their immediately enclosing { offset.
 * Only maps offsets that are inside an object (not inside a string).
 */
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

    // Record the enclosing brace for this non-string offset
    if (braceStack.length > 0) {
      map.set(i, braceStack[braceStack.length - 1]);
    }
  }

  return map;
}

export function activateStepCodeLens(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.recipe.json' },
      new RecipeStepCodeLensProvider(),
    ),
  );
}
