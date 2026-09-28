import {
  instrumentReportContent,
  instrumentReportReferences,
  instrumentReportTables,
} from "./instrument-report";

describe("conteúdo do instrumento no laudo", () => {
  it("produz a mesma tabela estruturada para SCARED-C e SCARED-P", () => {
    const child = instrumentReportTables("SCARED-C", {
      scared_c_total: 26,
      scared_c_panic_somatic_score: 8,
    }, {});
    const parent = instrumentReportTables("SCARED-P", {
      scared_p_form_2_total: 27,
      scared_p_form_2_respondent: "mother",
      scared_p_form_2_panic_somatic_score: 8,
    }, {});

    expect(child[0]).toMatchObject({
      kind: "matrix",
      headers: ["Dimensão", "Pontuação", "Ponto de corte", "Classificação"],
      rows: expect.arrayContaining([["Pontuação total", "26", "25", "Ponto de atenção"]]),
    });
    expect(parent[0]).toMatchObject({
      kind: "matrix",
      title: "SCARED-P — Respondente 2 (Mãe)",
      rows: expect.arrayContaining([["Pontuação total", "27", "25", "Ponto de atenção"]]),
    });
  });

  it("deduplica a referência compartilhada pelos dois SCARED", () => {
    const references = instrumentReportReferences([
      instrumentReportContent("SCARED-C"),
      instrumentReportContent("SCARED-P"),
    ]);
    expect(references.match(/Birmaher, B\. et al/g)).toHaveLength(1);
    expect(references).toContain("SCARED Child Version");
    expect(references).toContain("SCARED Parent Version");
  });

  it("usa a apresentação publicada para instrumentos sem tabela especial", () => {
    expect(instrumentReportTables("OUTRO", { score: 5 }, {
      tables: [{ title: "Pontuação", columns: [{ id: "score", label: "Escore" }] }],
    })).toEqual([{ kind: "fields", title: "Pontuação", fields: [{ id: "score", label: "Escore", value: 5 }] }]);
  });
});
