import { executeRules, validateRules } from "@laudo/rule-engine";
import { filterInstrumentResult, prepareInstrumentAnswers } from "../evaluations/instrument-answers";
import { instrumentReportTableNote, instrumentReportTables } from "../reports/instrument-report";
import { etdahIIInstrument, etdahIIRawMaximum } from "./etdah-ii-config";

// Dados sintéticos, sem pessoas reais. Percentis/classificações são apenas valores transcritos de exemplo:
// o teste verifica registro e validação, não a correção normativa (que não existe nesta versão).
const teacher = (prefix: string, extra: Record<string, unknown> = {}) => ({
  [`${prefix}_respondent`]: "Professora de Língua Portuguesa",
  [`${prefix}_reference_group`]: "male_public",
  [`${prefix}_attention_raw`]: "27",
  [`${prefix}_hyperactivity_impulsivity_raw`]: "35",
  [`${prefix}_learning_raw`]: "54",
  [`${prefix}_social_behavior_raw`]: "29",
  ...extra,
});

const register = (answers: Record<string, unknown>) => {
  const prepared = prepareInstrumentAnswers("ETDAH-II", etdahIIInstrument.formSchema, answers);
  return filterInstrumentResult(executeRules(etdahIIInstrument.rules, prepared.values), prepared).outputs;
};

describe("ETDAH-II — registro de resultado externo", () => {
  it("tem 4 fatores com 46 itens e nenhuma regra de correção automática", () => {
    expect(validateRules(etdahIIInstrument.rules)).toEqual([]);
    expect(etdahIIInstrument.rules).toHaveLength(0);
    const factorFields = etdahIIInstrument.formSchema.sections.find((section) => section.id === "etdah_ii_form_1_factors")?.fields ?? [];
    expect(factorFields.filter((field) => field.id.endsWith("_raw"))).toHaveLength(4);
  });

  it("registra pontos brutos como números e mantém ausentes os campos opcionais vazios", () => {
    expect(register({ ...teacher("etdah_ii_form_1"), etdah_ii_form_1_enabled: true, etdah_ii_form_2_enabled: true })).toEqual({
      etdah_ii_form_1_respondent: "Professora de Língua Portuguesa",
      etdah_ii_form_1_reference_group: "male_public",
      etdah_ii_form_1_attention_raw: 27,
      etdah_ii_form_1_hyperactivity_impulsivity_raw: 35,
      etdah_ii_form_1_learning_raw: 54,
      etdah_ii_form_1_social_behavior_raw: 29,
    });
  });

  it("guarda percentil, classificação e escore Z transcritos e ignora professores não preenchidos", () => {
    const outputs = register({
      ...teacher("etdah_ii_form_1", { etdah_ii_form_1_attention_percentile: "20", etdah_ii_form_1_attention_classification: "Inferior", etdah_ii_form_1_attention_z: "-1,0" }),
      ...teacher("etdah_ii_form_3", { etdah_ii_form_3_reference_group: "general" }),
      etdah_ii_form_2_enabled: true,
    });
    expect(outputs).toMatchObject({ etdah_ii_form_1_attention_percentile: 20, etdah_ii_form_1_attention_classification: "Inferior", etdah_ii_form_1_attention_z: -1 });
    expect(outputs.etdah_ii_form_3_reference_group).toBe("general");
    expect(Object.keys(outputs).some((key) => key.startsWith("etdah_ii_form_2_"))).toBe(false);
  });

  it.each([
    ["sem nenhum formulário", { etdah_ii_form_1_enabled: true }, "Preencha pelo menos um formulário"],
    ["sem professor", teacher("etdah_ii_form_1", { etdah_ii_form_1_respondent: "" }), "identifique o professor"],
    ["sem tabela de referência", teacher("etdah_ii_form_1", { etdah_ii_form_1_reference_group: "" }), "tabela de referência"],
    ["grupo inexistente", teacher("etdah_ii_form_1", { etdah_ii_form_1_reference_group: "outro" }), "tabela de referência"],
    ["fator sem pontos brutos", teacher("etdah_ii_form_1", { etdah_ii_form_1_learning_raw: "" }), "pontos brutos de Aprendizagem"],
    ["pontos brutos decimais", teacher("etdah_ii_form_1", { etdah_ii_form_1_learning_raw: "54.5" }), "pontos brutos de Aprendizagem"],
    ["pontos brutos negativos", teacher("etdah_ii_form_1", { etdah_ii_form_1_attention_raw: "-1" }), "pontos brutos de Atenção"],
    ["pontos brutos acima do limite", teacher("etdah_ii_form_1", { etdah_ii_form_1_social_behavior_raw: String(etdahIIRawMaximum(6) + 1) }), "pontos brutos de Comportamento Social"],
    ["percentil acima de 100", teacher("etdah_ii_form_1", { etdah_ii_form_1_attention_percentile: "101" }), "percentil de Atenção"],
    ["percentil não numérico", teacher("etdah_ii_form_1", { etdah_ii_form_1_attention_percentile: "alto" }), "percentil de Atenção"],
    ["escore Z fora do intervalo", teacher("etdah_ii_form_1", { etdah_ii_form_1_attention_z: "12" }), "escore Z de Atenção"],
    ["formulário 2 incompleto", { ...teacher("etdah_ii_form_1"), etdah_ii_form_2_respondent: "Professor de Matemática" }, "Formulário 2"],
  ])("recusa o registro %s", (_, answers, message) => {
    expect(() => prepareInstrumentAnswers("ETDAH-II", etdahIIInstrument.formSchema, answers)).toThrow(message);
  });

  it("aceita os limites exatos dos pontos brutos", () => {
    const outputs = register(teacher("etdah_ii_form_1", { etdah_ii_form_1_attention_raw: "0", etdah_ii_form_1_social_behavior_raw: String(etdahIIRawMaximum(6)) }));
    expect(outputs).toMatchObject({ etdah_ii_form_1_attention_raw: 0, etdah_ii_form_1_social_behavior_raw: 36 });
  });

  it("gera uma tabela de laudo por professor, com “—” para valores não informados", () => {
    const outputs = register({
      ...teacher("etdah_ii_form_1", { etdah_ii_form_1_attention_percentile: "20", etdah_ii_form_1_attention_classification: "Inferior" }),
      ...teacher("etdah_ii_form_2", { etdah_ii_form_2_respondent: "Professor de Matemática", etdah_ii_form_2_attention_z: "0,67" }),
    });
    const tables = instrumentReportTables("ETDAH-II", outputs, {});
    expect(tables).toEqual([
      {
        kind: "matrix",
        title: "ETDAH-II — Professor 1: Professora de Língua Portuguesa (referência: Masculino (Público))",
        headers: ["Fator", "Pontos brutos", "Percentil", "Classificação"],
        rows: [
          ["Atenção", "27", "20", "Inferior"],
          ["Hiperatividade/Impulsividade", "35", "—", "—"],
          ["Aprendizagem", "54", "—", "—"],
          ["Comportamento Social", "29", "—", "—"],
        ],
      },
      expect.objectContaining({
        title: "ETDAH-II — Professor 2: Professor de Matemática (referência: Masculino (Público))",
        headers: ["Fator", "Pontos brutos", "Percentil", "Classificação", "Escore Z"],
        rows: expect.arrayContaining([["Atenção", "27", "—", "—", "0,67"]]),
      }),
    ]);
    expect(instrumentReportTableNote("ETDAH-II", tables)).toContain("transcritos pelo profissional");
  });
});
