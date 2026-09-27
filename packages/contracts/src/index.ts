export type InstrumentVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type InstrumentFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'BOOLEAN'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'SCALE';

export type RuleType =
  | 'SCORE_ITEM'
  | 'SUM'
  | 'COUNT'
  | 'RANGE'
  | 'CONDITIONAL'
  | 'FORMULA';

export interface InstrumentFieldOption {
  value: string;
  label: string;
}

export interface InstrumentField {
  id: string;
  type: InstrumentFieldType;
  label: string;
  required: boolean;
  options?: InstrumentFieldOption[];
}

export interface InstrumentFormSchema {
  sections: Array<{
    id: string;
    title: string;
    fields: InstrumentField[];
  }>;
}

export interface InstrumentRule {
  id: string;
  order: number;
  type: RuleType;
  config: Record<string, unknown>;
  output: string;
}

export interface InstrumentDefinitionConfig {
  code: string;
  name: string;
  version: string;
  formSchema: InstrumentFormSchema;
  rules: InstrumentRule[];
  outputSchema: Record<string, unknown>;
  presentationSchema?: InstrumentPresentationSchema;
}

export interface InstrumentPresentationField {
  id: string;
  label?: string;
}

export interface InstrumentPresentationSchema {
  tables?: Array<{ title?: string; columns: InstrumentPresentationField[] }>;
  charts?: Array<{ title?: string; type: 'BAR'; fields: InstrumentPresentationField[] }>;
}

export interface RuleTraceItem {
  ruleId: string;
  type: RuleType;
  inputs: Record<string, unknown>;
  output: string;
  value: unknown;
}

export interface RuleMessage {
  code: string;
  message: string;
  ruleId?: string;
}

export interface RuleEngineResult {
  outputs: Record<string, unknown>;
  trace: RuleTraceItem[];
  errors: RuleMessage[];
  warnings: RuleMessage[];
}
