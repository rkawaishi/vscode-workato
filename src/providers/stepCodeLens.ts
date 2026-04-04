import * as vscode from 'vscode';

const PROVIDER_REGEX = /"provider"\s*:\s*"([^"]+)"/;
const NAME_REGEX = /"name"\s*:\s*"([^"]+)"/;
const MNEMONIC_REGEX = /"mnemonic"\s*:\s*"([^"]+)"/;
const COMMENT_REGEX = /"comment"\s*:\s*"([^"]+)"/;
const NUMBER_REGEX = /"number"\s*:\s*(\d+)/;

interface StepInfo {
  braceOffset: number;
  keyword: string;
  blockText: string;
}

class RecipeStepCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!document.uri.fsPath.endsWith('.recipe.json')) {
      return [];
    }

    const text = document.getText();
    const steps = findSteps(text);
    const lenses: vscode.CodeLens[] = [];

    for (const step of steps) {
      const provider = PROVIDER_REGEX.exec(step.blockText)?.[1] || '';
      const mnemonic = MNEMONIC_REGEX.exec(step.blockText)?.[1];
      const name = NAME_REGEX.exec(step.blockText)?.[1] || '';
      const comment = COMMENT_REGEX.exec(step.blockText)?.[1] || '';
      const number = NUMBER_REGEX.exec(step.blockText)?.[1];

      const displayName = mnemonic || name;

      let label: string;
      if (step.keyword === 'trigger') {
        label = `━━━ ⚡ TRIGGER: ${provider} / ${displayName} ━━━`;
      } else if (step.keyword === 'foreach') {
        label = `━━━ 🔄 LOOP (Step ${number ?? '?'}) ━━━`;
      } else {
        label = `━━━ Step ${number ?? '?'}: ${provider} / ${displayName} ━━━`;
      }

      if (comment) {
        label += `  « ${comment} »`;
      }

      const bracePos = document.positionAt(step.braceOffset);
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
 * Forward-scan to find all step objects and their opening brace positions.
 * Tracks brace nesting to correctly identify the { that starts each step.
 */
function findSteps(text: string): StepInfo[] {
  const steps: StepInfo[] = [];
  // Stack of { offsets at each nesting level
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

    // Check if we're at a "keyword" field
    if (ch === '"' || text.substring(i, i + 9) !== '"keyword"') {
      continue;
    }

    // Found "keyword" - check if it matches trigger/action/foreach
    const afterKey = text.substring(i + 9, i + 50);
    const keywordMatch = /^\s*:\s*"(trigger|action|foreach)"/.exec(afterKey);
    if (!keywordMatch) {
      continue;
    }

    const keyword = keywordMatch[1];
    // The current top of braceStack is the { that contains this keyword
    const braceOffset = braceStack[braceStack.length - 1];
    if (braceOffset === undefined) {
      continue;
    }

    // Extract a chunk of text from the brace to ~1000 chars ahead for metadata
    const blockText = text.substring(braceOffset, Math.min(text.length, i + 500));
    steps.push({ braceOffset, keyword, blockText });
  }

  return steps;
}

export function activateStepCodeLens(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.recipe.json' },
      new RecipeStepCodeLensProvider(),
    ),
  );
}
