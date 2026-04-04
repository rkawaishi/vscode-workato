// Raw Workato JSON types (as exported)

export interface RawRecipe {
  name: string;
  description?: string;
  version?: number;
  private?: boolean;
  concurrency?: number;
  code: RawStep;
  config?: RawConnectionConfig[];
}

export interface RawStep {
  number: number;
  provider?: string;
  name?: string;
  as?: string;
  keyword: 'trigger' | 'action' | 'foreach' | string;
  input?: Record<string, unknown>;
  comment?: string;
  uuid?: string;
  block?: RawStep[];
  source?: string;
  dynamicPickListSelection?: Record<string, unknown>;
  toggleCfg?: Record<string, unknown>;
  extended_output_schema?: unknown[];
  extended_input_schema?: unknown[];
  visible_config_fields?: string[];
  mnemonic?: string;
  clear_scope?: boolean;
  format_version?: number;
  job_report_schema?: unknown[];
  job_report_config?: Record<string, unknown>;
}

export interface RawConnectionConfig {
  keyword: string;
  provider: string;
  skip_validation?: boolean;
  account_id?: {
    zip_name: string;
    name: string;
    folder: string;
  } | null;
}

// Parsed model types (human-readable)

export interface RecipeModel {
  name: string;
  description: string;
  connections: ConnectionRef[];
  trigger: RecipeStep;
}

export interface ConnectionRef {
  provider: string;
  name: string;
}

export interface RecipeStep {
  number: number;
  provider: string;
  name: string;
  alias: string;
  keyword: string;
  comment: string;
  inputs: ResolvedInput[];
  children: RecipeStep[];
  source?: ResolvedInput;
}

export interface ResolvedInput {
  key: string;
  displayValue: string;
  rawValue: string;
  references: PillRef[];
}

export interface PillRef {
  stepAlias: string;
  provider: string;
  path: string[];
}
