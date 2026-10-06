import { executeRules, validateRules } from "@laudo/rule-engine";
import { filterInstrumentResult, prepareInstrumentAnswers } from "../evaluations/instrument-answers";
import { instrumentReportTables } from "../reports/instrument-report";
import { bdiIIInstrument } from "./bdi-ii-config";

// Casos sintéticos (sem dados pessoais).
const answersFrom = (scores: number[]) =>
  Object.fromEntries(scores.map((score, index) => [`bdi_ii_${index + 1}`, String(score)]));

const calculate = (scores: number[]) => {
  const prepared = prepareInstrumentAnswers("BDI-II", bdiIIInstrument.formSchema, answersFrom(scores));
  return filterInstrumentResult(executeRules(bdiIIInstrument.rules, prepared.values), prepared);
};

describe("BDI-II", () => {
  it("tem 21 itens com pontuação de 0 a 3 e regras válidas", () => {
    const fields = bdiIIInstrument.formSchema.sections.flatMap((section) => section.fields);
    expect(fields).toHaveLength(21);
    expect(fields.every((field) => field.required && field.options?.map((option) => option.value).join() === "0,1,2,3")).toBe(true);
    expect(validateRules(bdiIIInstrument.rules)).toEqual([]);
  });

  it.each([
    ["mínimo", Array(21).fill(0), 0],
    ["máximo", Array(21).fill(3), 63],
    ["tela de referência", [1, 1, 2, 2, 2, 3, 2, 2, 1, 3, 3, 2, 1, 2, 1, 1, 3, 1, 1, 3, 0], 37],
  ])("soma o escore bruto (%s)", (_, scores, total) => {
    expect(calculate(scores).outputs.bdi_ii_total_raw).toBe(total);
  });

  it("guarda somente o escore bruto e o item 9 no resultado", () => {
    const scores = Array(21).fill(0);
    scores[8] = 2;
    expect(calculate(scores).outputs).toEqual({ bdi_ii_total_raw: 2, bdi_ii_item_9_score: 2 });
  });

  it("recusa respostas ausentes ou fora de 0–3", () => {
    const missing = answersFrom(Array(21).fill(1));
    delete missing.bdi_ii_21;
    expect(() => prepareInstrumentAnswers("BDI-II", bdiIIInstrument.formSchema, missing)).toThrow("Corrija as respostas obrigatórias");
    expect(() => prepareInstrumentAnswers("BDI-II", bdiIIInstrument.formSchema, { ...answersFrom(Array(21).fill(1)), bdi_ii_3: "4" }))
      .toThrow("Corrija as respostas obrigatórias");
  });

  it("exporta o escore bruto sem classificação e sem o item 9", () => {
    const tables = instrumentReportTables("BDI-II", { bdi_ii_total_raw: 37, bdi_ii_item_9_score: 1 }, {});
    expect(tables).toEqual([{
      kind: "matrix",
      title: "BDI-II — resultado",
      headers: ["Pontuação total", "Classificação"],
      rows: [["37 / 63", "Não disponível"]],
    }]);
  });
});
