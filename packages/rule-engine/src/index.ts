import type {
  InstrumentRule,
  RuleEngineResult,
  RuleMessage,
  RuleTraceItem,
} from '@laudo/contracts';
import { Parser } from 'expr-eval';

type ExecutionContext = Record<string, unknown>;

function numeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function valuesFrom(config: Record<string, unknown>, context: ExecutionContext): unknown[] {
  const inputs = Array.isArray(config.inputs) ? config.inputs : [];
  return inputs.map((input) => context[String(input)]);
}

export function executeRules(
  rules: InstrumentRule[],
  answers: ExecutionContext,
): RuleEngineResult {
  const context: ExecutionContext = { ...answers };
  const trace: RuleTraceItem[] = [];
  const errors: RuleMessage[] = [];
  const warnings: RuleMessage[] = [];

  for (const rule of [...rules].sort((a, b) => a.order - b.order)) {
    try {
      const config = rule.config;
      let value: unknown;
      let inputs: Record<string, unknown> = {};

      if (rule.type === 'SCORE_ITEM') {
        const field = String(config.field ?? '');
        const mapping = (config.mapping ?? {}) as Record<string, unknown>;
        value = mapping[String(context[field])];
        inputs = { [field]: context[field] };
      } else if (rule.type === 'SUM') {
        const values = valuesFrom(config, context);
        value = values.reduce<number>((total, item) => total + numeric(item), 0);
        inputs = { values };
      } else if (rule.type === 'COUNT') {
        const values = valuesFrom(config, context);
        const condition = (config.condition ?? {}) as Record<string, unknown>;
        const threshold = numeric(condition.value);
        value = values.filter((item) => {
          const current = numeric(item);
          if (condition.operator === '>=') return current >= threshold;
          if (condition.operator === '>') return current > threshold;
          if (condition.operator === '<=') return current <= threshold;
          if (condition.operator === '<') return current < threshold;
          if (condition.operator === '=') return current === threshold;
          return false;
        }).length;
        inputs = { values, condition };
      } else if (rule.type === 'RANGE') {
        const input = context[String(config.input)];
        const ranges = Array.isArray(config.ranges) ? config.ranges : [];
        const current = numeric(input);
        const selected = ranges.find((range) => {
          const item = range as Record<string, unknown>;
          return current >= numeric(item.min) && current <= numeric(item.max);
        }) as Record<string, unknown> | undefined;
        value = selected?.result;
        inputs = { input };
      } else if (rule.type === 'CONDITIONAL') {
        const condition = (config.condition ?? {}) as Record<string, unknown>;
        const current = context[String(condition.field)];
        const expected = condition.value;
        const matches = condition.operator === '>=' ? numeric(current) >= numeric(expected)
          : condition.operator === '=' ? current === expected
            : false;
        value = matches ? config.then : config.else;
        inputs = { current, condition };
      } else if (rule.type === 'FORMULA') {
        const expression = String(config.expression ?? '');
        if (!expression) throw new Error('Fórmula vazia.');
        const variables = Object.fromEntries((Array.isArray(config.inputs) ? config.inputs : []).map((input) => [String(input), numeric(context[String(input)])]));
        value = Parser.parse(expression).evaluate(variables);
        inputs = { expression, variables };
      } else {
        errors.push({ code: 'UNSUPPORTED_RULE', message: `Regra não suportada: ${rule.type}`, ruleId: rule.id });
        continue;
      }

      context[rule.output] = value;
      trace.push({ ruleId: rule.id, type: rule.type, inputs, output: rule.output, value });
    } catch (error) {
      errors.push({ code: 'RULE_EXECUTION_ERROR', message: `Falha ao executar a regra ${rule.id}.`, ruleId: rule.id });
    }
  }

  return { outputs: context, trace, errors, warnings };
}

export function validateRules(rules: InstrumentRule[]): RuleMessage[] {
  const messages: RuleMessage[] = [];
  const outputs = new Set<string>();
  const supported = new Set(['SCORE_ITEM', 'SUM', 'COUNT', 'RANGE', 'CONDITIONAL', 'FORMULA']);
  const dependencies = new Map<string, string[]>();
  for (const rule of rules) {
    if (!rule.id || !rule.output) messages.push({ code: 'INVALID_RULE', message: 'Toda regra precisa de id e output.', ruleId: rule.id });
    if (outputs.has(rule.output)) messages.push({ code: 'DUPLICATE_OUTPUT', message: `Output duplicado: ${rule.output}.`, ruleId: rule.id });
    outputs.add(rule.output);
    if (!rule.type) messages.push({ code: 'MISSING_TYPE', message: 'Toda regra precisa de tipo.', ruleId: rule.id });
    if (rule.type && !supported.has(rule.type)) messages.push({ code: 'UNSUPPORTED_RULE', message: `Regra não suportada: ${rule.type}.`, ruleId: rule.id });
    const config = rule.config ?? {};
    const refs = [config.field, config.input, ...(Array.isArray(config.inputs) ? config.inputs : [])].filter((value): value is string => typeof value === 'string');
    dependencies.set(rule.output, refs);
    if (rule.type === 'FORMULA') {
      try { Parser.parse(String(config.expression ?? '')); } catch { messages.push({ code: 'INVALID_FORMULA', message: 'Fórmula inválida.', ruleId: rule.id }); }
    }
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (output: string) => { if (visiting.has(output)) return true; if (visited.has(output)) return false; visiting.add(output); for (const dependency of dependencies.get(output) ?? []) if (outputs.has(dependency) && visit(dependency)) return true; visiting.delete(output); visited.add(output); return false; };
  for (const output of outputs) if (visit(output)) { messages.push({ code: 'CIRCULAR_DEPENDENCY', message: 'Dependência circular detectada.', ruleId: rules.find((rule) => rule.output === output)?.id }); break; }
  return messages;
}
