import { executeRules, validateRules } from "@laudo/rule-engine";
import type { InstrumentDefinitionConfig } from "@laudo/contracts";
import { filterInstrumentResult, prepareInstrumentAnswers } from "../evaluations/instrument-answers";
import { instrumentReportTables } from "../reports/instrument-report";
import { asrs18Instrument, snapIvInstrument } from "./instrument-config";
import { scaredCInstrument } from "./scared-c-config";
import { scaredPInstrument } from "./scared-p-config";
import { baiInstrument } from "./bai-config";
import { bdiIIInstrument } from "./bdi-ii-config";

/*
 * Regressão das configurações atuais com respostas sintéticas uniformes (todas na menor
 * ou na maior alternativa). Os valores esperados são a aritmética das regras configuradas;
 * isto NÃO substitui os casos de referência do manual exigidos para a liberação clínica.
 */
type Pattern = "min" | "max";

function fill(instrument: InstrumentDefinitionConfig, pattern: Pattern) {
  const answers: Record<string, unknown> = {};
  for (const section of instrument.formSchema.sections) {
    const form = section.id.match(/_form_(\d+)_/)?.[1];
    if (form && form !== "1") continue;
    for (const field of section.fields) {
      if (field.id.endsWith("_respondent")) answers[field.id] = field.options?.[1]?.value;
      else if (field.options?.length) answers[field.id] = field.options[pattern === "max" ? field.options.length - 1 : 0].value;
    }
  }
  return answers;
}

function calculate(instrument: InstrumentDefinitionConfig, pattern: Pattern) {
  const prepared = prepareInstrumentAnswers(instrument.code, instrument.formSchema, fill(instrument, pattern));
  return filterInstrumentResult(executeRules(instrument.rules, prepared.values), prepared).outputs;
}

const all = [asrs18Instrument, snapIvInstrument, scaredCInstrument, scaredPInstrument, baiInstrument, bdiIIInstrument];

describe("configurações dos instrumentos", () => {
  it.each(all.map((instrument) => [instrument.code, instrument] as const))("%s tem regras válidas", (_, instrument) => {
    expect(validateRules(instrument.rules)).toEqual([]);
  });

  it("ASRS-18 conta sintomas por domínio e aplica o corte configurado", () => {
    expect(calculate(asrs18Instrument, "max")).toMatchObject({
      inattention_symptom_count: 9, hyperactivity_impulsivity_symptom_count: 9,
      inattention_classification: "Indicativo de TDAH", hyperactivity_impulsivity_classification: "Indicativo de TDAH",
    });
    expect(calculate(asrs18Instrument, "min")).toMatchObject({
      inattention_symptom_count: 0, inattention_classification: "Abaixo do ponto de corte de rastreio",
    });
  });

  it("SNAP-IV soma os domínios do formulário preenchido", () => {
    expect(calculate(snapIvInstrument, "max")).toEqual({
      snap_iv_form_1_inattention_score: 27, snap_iv_form_1_inattention_classification: "Sintomas Graves",
      snap_iv_form_1_hyperactivity_impulsivity_score: 27, snap_iv_form_1_hyperactivity_impulsivity_classification: "Sintomas Graves",
      snap_iv_form_1_opposition_defiance_score: 24, snap_iv_form_1_opposition_defiance_classification: "Sintomas Graves",
    });
    expect(calculate(snapIvInstrument, "min")).toMatchObject({ snap_iv_form_1_inattention_score: 0, snap_iv_form_1_inattention_classification: "Sintomas Não Significativos" });
  });

  it.each([
    ["SCARED-C", scaredCInstrument, "scared_c"],
    ["SCARED-P", scaredPInstrument, "scared_p_form_1"],
  ] as const)("%s soma total e domínios", (_, instrument, prefix) => {
    expect(calculate(instrument, "max")).toMatchObject({
      [`${prefix}_total`]: 82,
      [`${prefix}_panic_somatic_score`]: 26,
      [`${prefix}_generalized_anxiety_score`]: 18,
      [`${prefix}_separation_anxiety_score`]: 16,
      [`${prefix}_social_anxiety_score`]: 14,
      [`${prefix}_school_avoidance_score`]: 8,
    });
    expect(calculate(instrument, "min")).toMatchObject({ [`${prefix}_total`]: 0 });
  });

  it.each([
    ["BAI", baiInstrument, "bai_total_raw"],
    ["BDI-II", bdiIIInstrument, "bdi_ii_total_raw"],
  ] as const)("%s soma o escore bruto de 0 a 63", (_, instrument, output) => {
    expect(calculate(instrument, "max")[output]).toBe(63);
    expect(calculate(instrument, "min")[output]).toBe(0);
  });

  it.each(all.map((instrument) => [instrument.code, instrument] as const))("%s gera tabela de laudo com o resultado calculado", (_, instrument) => {
    const tables = instrumentReportTables(instrument.code, calculate(instrument, "max"), (instrument.presentationSchema ?? {}) as never);
    expect(tables.length).toBeGreaterThan(0);
  });
});
