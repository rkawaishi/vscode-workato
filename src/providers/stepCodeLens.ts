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
    const lenses: vscode.CodeLens[] = [];

    let match: RegExpExecArray | null;
    KEYWORD_REGEX.lastIndex = 0;

    while ((match = KEYWORD_REGEX.exec(text)) !== null) {
      const keyword = match[1];

      // Find the opening { of this step object
      const blockStart = findEnclosingBrace(text, match.index);
      if (blockStart === -1) {
        continue;
      }

      // Search forward from block start for step metadata
      const searchEnd = Math.min(text.length, match.index + 1000);
      const context = text.substring(blockStart, searchEnd);

      const provider = PROVIDER_REGEX.exec(context)?.[1] || '';
      const mnemonic = MNEMONIC_REGEX.exec(context)?.[1];
      const name = NAME_REGEX.exec(context)?.[1] || '';
      const comment = COMMENT_REGEX.exec(context)?.[1] || '';
      const number = NUMBER_REGEX.exec(context)?.[1];

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

      // Place CodeLens at the opening { line
      const bracePos = document.positionAt(blockStart);
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
 * Find the opening { that encloses the given offset,
 * accounting for nested braces and JSON strings.
 */
function findEnclosingBrace(text: string, offset: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = offset; i >= 0; i--) {
    const ch = text[i];

    // Scanning backward, handle escape sequences in reverse
    if (inString) {
      if (ch === '"' && !escape) {
        inString = false;
      }
      // Check if this char is escaped by counting preceding backslashes
      escape = i > 0 && text[i - 1] === '\\' && !escape;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '}') {
      depth++;
    } else if (ch === '{') {
      if (depth === 0) {
        return i;
      }
      depth--;
    }
  }

  return -1;
}

export function activateStepCodeLens(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.recipe.json' },
      new RecipeStepCodeLensProvider(),
    ),
  );
}
