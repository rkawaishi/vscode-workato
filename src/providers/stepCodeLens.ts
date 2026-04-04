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
      const pos = document.positionAt(match.index);

      // Search the surrounding block for provider, name, number, comment
      const blockStart = text.lastIndexOf('{', match.index);
      const blockEnd = text.indexOf('}', match.index + match[0].length);
      if (blockStart === -1) {
        continue;
      }
      // Expand search a bit further for nested fields
      const searchEnd = Math.min(text.length, blockEnd + 500);
      const context = text.substring(blockStart, searchEnd);

      const provider = PROVIDER_REGEX.exec(context)?.[1] || '';
      const mnemonic = MNEMONIC_REGEX.exec(context)?.[1];
      const name = NAME_REGEX.exec(context)?.[1] || '';
      const comment = COMMENT_REGEX.exec(context)?.[1] || '';
      const number = NUMBER_REGEX.exec(context)?.[1];

      const displayName = mnemonic || name;
      let label: string;

      if (keyword === 'trigger') {
        label = `⚡ Trigger: ${provider} / ${displayName}`;
      } else if (keyword === 'foreach') {
        label = `🔄 Loop${number ? ` (Step ${number})` : ''}`;
      } else {
        label = `Step ${number ?? '?'}: ${provider} / ${displayName}`;
      }

      if (comment) {
        label += ` — ${comment}`;
      }

      const range = new vscode.Range(pos, pos);
      lenses.push(new vscode.CodeLens(range, {
        title: label,
        command: '',
      }));
    }

    return lenses;
  }
}

export function activateStepCodeLens(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.recipe.json' },
      new RecipeStepCodeLensProvider(),
    ),
  );
}
