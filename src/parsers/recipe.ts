import {
  RawRecipe,
  RawStep,
  RecipeModel,
  RecipeStep,
  ConnectionRef,
} from '../types/workato';
import { resolveInputs, resolveValue } from './pill';

/**
 * Parse raw recipe JSON into a structured RecipeModel.
 */
export function parseRecipe(raw: RawRecipe): RecipeModel {
  const connections = parseConnections(raw.config);
  const trigger = parseStep(raw.code);

  return {
    name: raw.name,
    description: raw.description || '',
    connections,
    trigger,
  };
}

function parseConnections(config?: RawRecipe['config']): ConnectionRef[] {
  if (!config) {
    return [];
  }
  return config
    .filter(c => c.account_id?.name)
    .map(c => ({
      provider: c.provider,
      name: c.account_id!.name,
    }));
}

function parseStep(raw: RawStep): RecipeStep {
  const inputs = raw.input ? resolveInputs(raw.input) : [];
  const children = (raw.block || []).map(parseStep);

  // For foreach steps, parse the source field
  let source;
  if (raw.keyword === 'foreach' && raw.source) {
    source = resolveValue(raw.source);
    source.key = 'source';
  }

  // Use mnemonic (custom HTTP action label) if available, fall back to name
  const inputObj = raw.input as Record<string, unknown> | undefined;
  const displayName = (inputObj?.mnemonic as string) || raw.name || raw.keyword;

  return {
    number: raw.number,
    provider: raw.provider || '',
    name: displayName,
    alias: raw.as || '',
    keyword: raw.keyword,
    comment: raw.comment || '',
    inputs,
    children,
    source,
  };
}
