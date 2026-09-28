import { filterInstrumentResult, prepareInstrumentAnswers } from "./instrument-answers";

describe("respostas dos instrumentos", () => {
  it("ignora formulários SNAP-IV não preenchidos no resultado", () => {
    const schema = { sections: [1, 2].map((number) => ({
      id: `snap_iv_form_${number}_questions`,
      fields: [{ id: `snap_iv_form_${number}_item_1` }],
    })) };
    const prepared = prepareInstrumentAnswers("SNAP-IV", schema, {
      snap_iv_form_1_respondent: "mother",
      snap_iv_form_1_item_1: "2",
    });
    const result = filterInstrumentResult({
      outputs: { snap_iv_form_1_score: 2, snap_iv_form_2_score: 0 },
      trace: [], errors: [], warnings: [],
    }, prepared);
    expect(result.outputs).toEqual({ snap_iv_form_1_score: 2 });
  });

  it("exige o formulário SCARED-P completo", () => {
    const schema = { sections: [{
      id: "scared_p_form_1_questions",
      fields: Array.from({ length: 41 }, (_, index) => ({ id: `scared_p_form_1_item_${index + 1}` })),
    }] };
    expect(() => prepareInstrumentAnswers("SCARED-P", schema, {
      scared_p_form_1_respondent: "mother",
      scared_p_form_1_item_1: "1",
    })).toThrow("Complete ou limpe as respostas do Formulário 1");
  });
});
