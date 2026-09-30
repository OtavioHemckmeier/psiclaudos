import { BadRequestException } from "@nestjs/common";
import type { RuleEngineResult } from "@laudo/contracts";

type FormSchema = {
  sections?: Array<{ id: string; fields?: Array<{ id: string; label?: string; required?: boolean; options?: Array<{ value: string }> }> }>;
};

type PreparedAnswers = {
  values: Record<string, unknown>;
  completedSnapIvForms: string[];
  completedScaredPForms: string[];
};

const formPrefixes = (schema: FormSchema, pattern: RegExp) => [...new Set(
  (schema.sections ?? []).map((section) => section.id.match(pattern)?.[1])
    .filter((prefix): prefix is string => Boolean(prefix)),
)];

function prepareSnapIv(schema: FormSchema, answers: Record<string, unknown>, values: Record<string, unknown>) {
  const prefixes = formPrefixes(schema, /^(snap_iv_form_\d+)_/);
  const completed: string[] = [];
  for (const prefix of prefixes) {
    const respondent = answers[`${prefix}_respondent`];
    const itemIds = (schema.sections ?? []).flatMap((section) => section.fields ?? [])
      .map((field) => field.id).filter((fieldId) => fieldId.startsWith(`${prefix}_item_`));
    const answeredItems = itemIds.filter((fieldId) => String(answers[fieldId] ?? "").trim());
    if (!respondent && answeredItems.length === 0) continue;
    if (!respondent || itemIds.some((fieldId) => !String(answers[fieldId] ?? "").trim()))
      throw new BadRequestException(`Complete ou limpe as respostas do ${prefix.replace("snap_iv_form_", "Formulário ")} antes de calcular.`);
    if (itemIds.some((fieldId) => !["0", "1", "2", "3"].includes(String(answers[fieldId]))))
      throw new BadRequestException(`Há uma resposta inválida no ${prefix.replace("snap_iv_form_", "Formulário ")}.`);
    completed.push(prefix);
  }
  if (!completed.length) throw new BadRequestException("Preencha pelo menos um formulário SNAP-IV antes de calcular.");
  for (const prefix of prefixes.filter((item) => !completed.includes(item))) {
    delete values[`${prefix}_respondent`];
    for (const field of Object.keys(values)) {
      if (field.startsWith(`${prefix}_item_`)) delete values[field];
    }
  }
  return completed;
}

function prepareScaredP(schema: FormSchema, answers: Record<string, unknown>) {
  const prefixes = formPrefixes(schema, /^(scared_p_form_\d+)_/);
  const fields = (schema.sections ?? []).flatMap((section) => section.fields ?? []);
  const completed: string[] = [];
  for (const prefix of prefixes) {
    if (answers[`${prefix}_enabled`] === false) continue;
    const respondent = answers[`${prefix}_respondent`];
    const itemIds = fields.map((field) => field.id).filter((fieldId) => fieldId.startsWith(`${prefix}_item_`));
    const answeredItems = itemIds.filter((fieldId) => String(answers[fieldId] ?? "").trim());
    if (!respondent && answeredItems.length === 0) continue;
    if (!respondent || itemIds.length !== 41 || answeredItems.length !== 41)
      throw new BadRequestException(`Complete ou limpe as respostas do ${prefix.replace("scared_p_form_", "Formulário ")} antes de calcular.`);
    if (itemIds.some((fieldId) => !["0", "1", "2"].includes(String(answers[fieldId]))))
      throw new BadRequestException(`Há uma resposta inválida no ${prefix.replace("scared_p_form_", "Formulário ")}.`);
    completed.push(prefix);
  }
  if (!completed.length) throw new BadRequestException("Preencha pelo menos um formulário SCARED-P antes de calcular.");
  return completed;
}

export function prepareInstrumentAnswers(code: string, schema: FormSchema, answers: Record<string, unknown>): PreparedAnswers {
  const values = { ...answers };
  const hasTabbedSnapIv = code === "SNAP-IV" && (schema.sections ?? []).some((section) => section.id.startsWith("snap_iv_form_"));
  const hasTabbedScaredP = code === "SCARED-P" && (schema.sections ?? []).some((section) => section.id.startsWith("scared_p_form_"));
  const completedSnapIvForms = hasTabbedSnapIv ? prepareSnapIv(schema, answers, values) : [];
  const completedScaredPForms = hasTabbedScaredP ? prepareScaredP(schema, answers) : [];
  const invalidRequiredFields = (schema.sections ?? []).flatMap((section) => section.fields ?? [])
    .filter((field) => field.required && (!String(values[field.id] ?? "").trim() || (field.options?.length && !field.options.some((option) => option.value === String(values[field.id])))));
  if (invalidRequiredFields.length) throw new BadRequestException(`Corrija as respostas obrigatórias: ${invalidRequiredFields.map((field) => field.label ?? field.id).join(', ')}.`);
  if (code === "SCARED-C" || (code === "SCARED-P" && !hasTabbedScaredP)) {
    const prefix = code === "SCARED-C" ? "scared_c" : "scared_p";
    const itemIds = (schema.sections ?? []).flatMap((section) => section.fields ?? [])
      .map((field) => field.id).filter((fieldId) => fieldId.startsWith(`${prefix}_`) && /^\d+$/.test(fieldId.slice(prefix.length + 1)));
    if (itemIds.length !== 41 || itemIds.some((fieldId) => !["0", "1", "2"].includes(String(values[fieldId]))))
      throw new BadRequestException(`${code} requer 41 respostas válidas (0, 1 ou 2).`);
  }
  return { values, completedSnapIvForms, completedScaredPForms };
}

export function filterInstrumentResult(result: RuleEngineResult, prepared: PreparedAnswers): RuleEngineResult {
  if (Object.prototype.hasOwnProperty.call(result.outputs, 'bai_total_raw')) {
    result.outputs = Object.fromEntries(Object.entries(result.outputs).filter(([field]) => field === 'bai_total_raw' || field === 'bai_answered_items'));
    return result;
  }
  if (prepared.completedSnapIvForms.length) {
    const prefixes = prepared.completedSnapIvForms;
    result.outputs = Object.fromEntries(Object.entries(result.outputs).filter(([output]) =>
      prefixes.some((prefix) => output.startsWith(`${prefix}_`) && (output.endsWith("_score") || output.endsWith("_classification"))),
    ));
    result.trace = result.trace.filter((item) => prefixes.some((prefix) => item.output.startsWith(`${prefix}_`)));
  }
  if (prepared.completedScaredPForms.length) {
    const prefixes = prepared.completedScaredPForms;
    result.outputs = Object.fromEntries(Object.entries(result.outputs).filter(([output]) =>
      prefixes.some((prefix) => output.startsWith(`${prefix}_`) &&
        (output.endsWith("_respondent") || output.endsWith("_total") || output.endsWith("_screen") || output.endsWith("_score"))),
    ));
    result.trace = result.trace.filter((item) => prefixes.some((prefix) => item.output.startsWith(`${prefix}_`)));
  }
  return result;
}
