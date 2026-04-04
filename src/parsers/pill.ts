import { PillRef, ResolvedInput } from '../types/workato';

const PILL_PATTERN = /#\{_dp\('(.+?)'\)\}/g;
const BARE_PILL_PATTERN = /=_dp\('(.+?)'\)(?:\.[a-zA-Z_]\w*(?:\([^)]*\))*)*/g;
const FORMULA_PATTERN = /#\{_\('([^']+)'\)(?:[^}]*)?\}/g;
const RUBY_FORMULA_PATTERN = /=_\('([^']+)'\)(?:\.[a-zA-Z_]\w*(?:\([^)]*\))*)*/g;

/**
 * Parse a single _dp() JSON payload into a PillRef.
 */
export function parsePillPayload(jsonStr: string): PillRef | null {
  try {
    const obj = JSON.parse(jsonStr);
    if (obj.pill_type === 'output' && obj.line && obj.path) {
      return {
        stepAlias: obj.line,
        provider: obj.provider || '',
        path: Array.isArray(obj.path) ? obj.path.map(formatPathSegment) : [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

function formatPathSegment(segment: unknown): string {
  if (typeof segment === 'string') {
    return segment;
  }
  if (typeof segment === 'object' && segment !== null) {
    const obj = segment as Record<string, unknown>;
    if (obj.path_element_type === 'current_item') {
      return '[*]';
    }
  }
  return String(segment);
}

/**
 * Format a PillRef as a human-readable string.
 * e.g. [fd6582a2].reaction_added.item.channel
 */
export function formatPillRef(ref: PillRef): string {
  const path = ref.path.map(p => p === '[*]' ? p : `.${p}`).join('');
  return `[${ref.stepAlias}]${path}`;
}

/**
 * Resolve all pill references in a string value.
 * Returns the display string and extracted references.
 */
export function resolveValue(value: unknown): ResolvedInput {
  const rawValue = typeof value === 'string' ? value : JSON.stringify(value);
  const references: PillRef[] = [];

  if (typeof value !== 'string') {
    return { key: '', displayValue: rawValue, rawValue, references };
  }

  // Handle #{_dp()} pills
  let displayValue = value.replace(PILL_PATTERN, (_match, jsonStr) => {
    const ref = parsePillPayload(jsonStr);
    if (ref) {
      references.push(ref);
      return formatPillRef(ref);
    }
    return _match;
  });

  // Handle =_dp() pills (bare, without #{} wrapping)
  displayValue = displayValue.replace(BARE_PILL_PATTERN, (_match, jsonStr) => {
    const ref = parsePillPayload(jsonStr);
    if (ref) {
      references.push(ref);
      return formatPillRef(ref);
    }
    return _match;
  });

  // Handle _('data.provider.step.field') formula references
  displayValue = displayValue.replace(FORMULA_PATTERN, (_match, dataPath: string) => {
    const parts = dataPath.split('.');
    // Format: data.provider.step.field... → [step].field...
    if (parts.length >= 3 && parts[0] === 'data') {
      const step = parts[2];
      const fieldPath = parts.slice(3).join('.');
      return fieldPath ? `[${step}].${fieldPath}` : `[${step}]`;
    }
    return dataPath;
  });

  // Handle =_('data.provider.step.field') Ruby formula references
  displayValue = displayValue.replace(RUBY_FORMULA_PATTERN, (_match, dataPath: string) => {
    const parts = dataPath.split('.');
    if (parts.length >= 3 && parts[0] === 'data') {
      const step = parts[2];
      const fieldPath = parts.slice(3).join('.');
      return fieldPath ? `[${step}].${fieldPath}` : `[${step}]`;
    }
    return dataPath;
  });

  return { key: '', displayValue, rawValue, references };
}

/**
 * Resolve an input object's values, extracting pill references.
 */
export function resolveInputs(input: Record<string, unknown>): ResolvedInput[] {
  const results: ResolvedInput[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (isMetadataKey(key)) {
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse into nested objects (e.g., input.data, input.advanced)
      const nested = resolveInputs(value as Record<string, unknown>);
      for (const item of nested) {
        results.push({ ...item, key: `${key}.${item.key}` });
      }
    } else {
      const resolved = resolveValue(value);
      resolved.key = key;
      // Skip schema strings and uninteresting values
      if (!isSchemaString(resolved.rawValue)) {
        results.push(resolved);
      }
    }
  }

  return results;
}

const METADATA_KEYS = new Set([
  'schema', 'output', 'response_headers', 'inspect', 'mnemonic', 'code',
]);

function isMetadataKey(key: string): boolean {
  return METADATA_KEYS.has(key);
}

function isSchemaString(value: string): boolean {
  if (value.length > 200 && value.startsWith('[{')) {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
