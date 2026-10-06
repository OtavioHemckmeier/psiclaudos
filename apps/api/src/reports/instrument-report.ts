import { classifySnapIvScore, snapIvInstrument } from "../catalog/instrument-config";
import { scaredCDomains } from "../catalog/scared-c-config";

export type PresentationField = { id: string; label?: string };
export type PresentationSchema = {
  tables?: Array<{ title?: string; columns: PresentationField[] }>;
  charts?: Array<{
    title?: string;
    type: "BAR";
    fields: PresentationField[];
    maximum?: number;
    expectedRange?: string;
  }>;
};

export type InstrumentReportContent = {
  purpose: string;
  theoreticalContext: string;
  interpretation: string;
  references: string[];
};

export type InstrumentReportTable =
  | { kind: "matrix"; title: string; headers: string[]; rows: string[][] }
  | { kind: "fields"; title: string; fields: Array<{ id: string; label: string; value: unknown }> };

const sharedScaredReference = "Birmaher, B. et al. The Screen for Child Anxiety Related Emotional Disorders (SCARED): scale construction and psychometric characteristics. JACAAP, 1997. https://pubmed.ncbi.nlm.nih.gov/9100430/";

const reportContent: Record<string, InstrumentReportContent> = {
  "BAI": {
    purpose: "registrar a intensidade de sintomas de ansiedade por autorrelato, conforme a versão em português selecionada.",
    theoreticalContext: "O BAI reúne 21 itens com respostas de 0 a 3. Nesta versão, a plataforma apresenta somente a soma bruta das respostas, de 0 a 63.",
    interpretation: "A classificação normativa e a interpretação clínica automática não estão disponíveis para esta versão, cujo status regulatório deve ser considerado pelo profissional responsável.",
    references: ["Cunha, J. A. Manual da versão em português das Escalas Beck. São Paulo: Casa do Psicólogo, 2001.", "SATEPSI — Sistema de Avaliação de Testes Psicológicos / Conselho Federal de Psicologia. Consulta de testes desfavoráveis."],
  },
  "ASRS-18": {
    purpose: "avaliar a frequência de manifestações de desatenção e hiperatividade/impulsividade em adultos, auxiliando na identificação de casos que requerem avaliação clínica aprofundada.",
    theoreticalContext: "A ASRS-18 é uma escala de autorrelato voltada ao rastreamento de manifestações de desatenção e hiperatividade/impulsividade em adultos. Seus indicadores descrevem frequência de sintomas e devem ser compreendidos à luz do funcionamento cotidiano, da história clínica e de outras fontes da avaliação.",
    interpretation: "A escala organiza indicadores de desatenção e de hiperatividade/impulsividade referentes aos últimos seis meses. O resultado é de rastreamento e deve ser integrado à avaliação clínica, ao histórico de desenvolvimento e aos prejuízos funcionais observados.",
    references: [
      "Kessler, R. C. et al. The World Health Organization Adult ADHD Self-Report Scale (ASRS). Psychological Medicine, 2005.",
      "Harvard Medical School. ASRS Scales and Checklists.",
      "Mattos, P. et al. Adaptação transcultural da ASRS para o português. Revista de Psiquiatria Clínica, 2006.",
    ],
  },
  "BDI-II": {
    purpose: "registrar a intensidade de sintomas depressivos por autorrelato, conforme a adaptação brasileira utilizada.",
    theoreticalContext: "O BDI-II reúne 21 grupos de afirmações sobre sintomas depressivos nas duas semanas anteriores, cada um pontuado de 0 a 3. Nesta versão, a plataforma registra a pontuação de cada item e apresenta somente a soma bruta, de 0 a 63.",
    interpretation: "A classificação de gravidade e a interpretação clínica automática não estão disponíveis nesta versão da plataforma. A análise do escore deve seguir o manual e as normas da adaptação brasileira e ser integrada à entrevista e às demais fontes da avaliação.",
    references: ["Werlang, B. S. G.; Gorenstein, C.; Argimon, I. I. L. & Wang, Y. P. (2010). Inventário de Depressão de Beck (BDI-II). São Paulo: Casapsi Livraria e Editora."],
  },
  "SNAP-IV": {
    purpose: "avaliar relatos de desatenção, hiperatividade/impulsividade e oposição/desafio em crianças e adolescentes.",
    theoreticalContext: "A SNAP-IV de 26 itens reúne relatos sobre desatenção (itens 1–9), hiperatividade/impulsividade (10–18) e oposição/desafio (19–26). Cada item recebe de 0 a 3 pontos; as pontuações são somadas por domínio.",
    interpretation: "As classificações por domínio seguem faixas sugeridas no guia de pontuação da SNAP-IV de 26 itens. Os resultados são indicadores de rastreamento e devem ser interpretados com entrevista clínica, histórico e informações de outros contextos.",
    references: ["UCSF Child and Adolescent Psychiatry Portal. SNAP-IV 26-Item Teacher and Parent Rating Scale: scoring guide. https://capp.ucsf.edu/sites/g/files/tkssra5836/f/SNAP-IV-26-item-Teacher-and-Parent-rating-scale.pdf"],
  },
  "SCARED-C": {
    purpose: "rastrear sintomas de ansiedade em crianças e adolescentes por autorrelato, considerando o escore total e cinco domínios.",
    theoreticalContext: "O SCARED-C reúne 41 itens de autorrelato referentes aos últimos três meses. Cada item vale de 0 a 2 pontos; o total varia de 0 a 82 e os itens se distribuem em pânico/somático, ansiedade generalizada, separação, ansiedade social e evitação escolar.",
    interpretation: "Os escores e pontos de atenção seguem a ficha original e indicam necessidade de investigação, não diagnóstico. Os enunciados em português da plataforma são tradução operacional não validada; conferir a adaptação e as normas adotadas antes do uso clínico.",
    references: [sharedScaredReference, "University of Pittsburgh. SCARED Child Version (41 items), formulário e guia de pontuação. https://www.pediatricbipolar.pitt.edu/sites/default/files/assets/SCAREDChildVersion_1.19.18.pdf"],
  },
  "SCARED-P": {
    purpose: "rastrear sintomas de ansiedade em crianças e adolescentes a partir do relato de pais ou cuidadores, considerando o escore total e cinco domínios.",
    theoreticalContext: "O SCARED-P reúne 41 itens respondidos por pais ou cuidadores sobre os últimos três meses. Cada item vale de 0 a 2 pontos; o total varia de 0 a 82 e os itens se distribuem em pânico/somático, ansiedade generalizada, separação, ansiedade social e evitação escolar.",
    interpretation: "Os escores e pontos de atenção da versão pais seguem a ficha original e indicam necessidade de investigação, não diagnóstico. Comparações com o autorrelato da criança devem considerar as diferenças entre informantes. Os enunciados em português foram fornecidos para esta configuração e não tiveram correspondência com adaptação validada verificada; conferir a versão e as normas adotadas antes do uso clínico.",
    references: [sharedScaredReference, "University of Pittsburgh. SCARED Parent Version (41 items), formulário e guia de pontuação. https://pediatricbipolar.pitt.edu/sites/default/files/assets/SCAREDParentVersion_1.19.18_0.pdf"],
  },
};

const defaultContent: InstrumentReportContent = {
  purpose: "instrumento aplicado conforme a versão técnica selecionada para esta avaliação.",
  theoreticalContext: "O instrumento contribui com indicadores específicos que devem ser integrados às demais fontes técnicas, clínicas e contextuais do processo avaliativo.",
  interpretation: "Os resultados a seguir devem ser analisados em conjunto com os demais dados clínicos e contextuais da avaliação.",
  references: [],
};

export const instrumentReportContent = (code: string) => reportContent[code] ?? defaultContent;

export const instrumentReportReferences = (contents: InstrumentReportContent[]) => {
  const references = [...new Set(contents.flatMap((content) => content.references))];
  return references.length ? references.map((reference) => `• ${reference}`).join("\n") : "Referências técnicas do instrumento utilizado disponíveis no cadastro da plataforma.";
};

export const instrumentReportPresentation = (code: string, result: Record<string, unknown>, presentation: unknown): PresentationSchema => {
  const source = code === "SNAP-IV" && Object.keys(result).some((field) => field.startsWith("snap_iv_form_"))
    ? snapIvInstrument.presentationSchema
    : presentation;
  return source && typeof source === "object" && !Array.isArray(source) ? source as PresentationSchema : {};
};

export const scaredReportTableNote = "Pontuação: soma dos itens da dimensão (0 a 2 por item; total de 0 a 82). Ponto de corte: referência de rastreamento da ficha original. Atingir o corte sugere investigação clínica; ficar abaixo dele não exclui sintomas ou transtorno.";

export function instrumentReportTables(code: string, result: Record<string, unknown>, presentation: PresentationSchema): InstrumentReportTable[] {
  if (code === "BAI" && "bai_total_raw" in result) {
    return [{ kind: "matrix", title: "BAI — resultado", headers: ["Pontuação total", "Itens respondidos", "Classificação"], rows: [[`${String(result.bai_total_raw)} / 63`, `${String(result.bai_answered_items ?? 21)} / 21`, "Não disponível para esta versão"]] }];
  }
  if (code === "BDI-II" && "bdi_ii_total_raw" in result) {
    // O item 9 fica fora do documento exportado; o aviso aparece somente na tela.
    return [{ kind: "matrix", title: "BDI-II — resultado", headers: ["Pontuação total", "Classificação"], rows: [[`${String(result.bdi_ii_total_raw)} / 63`, "Não disponível"]] }];
  }
  if (code === "SNAP-IV") {
    const formNumbers = [...new Set(Object.keys(result)
      .map((field) => field.match(/^snap_iv_form_(\d+)_(?:inattention|hyperactivity_impulsivity|opposition_defiance)_score$/)?.[1])
      .filter((number): number is string => Boolean(number)).map(Number))].sort((first, second) => first - second);
    const domains = [
      { key: "inattention", label: "Desatenção" },
      { key: "hyperactivity_impulsivity", label: "Hiperatividade/Impulsividade" },
      { key: "opposition_defiance", label: "Oposição/Desafio" },
    ];
    const tables = formNumbers.map((formNumber): InstrumentReportTable => ({
      kind: "matrix",
      title: `SNAP-IV — Formulário ${formNumber}`,
      headers: ["Itens", "Pontuação", "Classificação"],
      rows: domains.flatMap((domain) => {
        const prefix = `snap_iv_form_${formNumber}_${domain.key}`;
        const score = Number(result[`${prefix}_score`]);
        if (!Number.isFinite(score) || !(`${prefix}_score` in result)) return [];
        const storedClassification = result[`${prefix}_classification`];
        const classification = typeof storedClassification === "string" && storedClassification.trim()
          ? storedClassification : classifySnapIvScore(score, domain.key === "opposition_defiance");
        return [[domain.label, String(score), classification]];
      }),
    }));
    if (tables.length) return tables;
  }
  if (code === "SCARED-C" || code === "SCARED-P") {
    const prefixes = code === "SCARED-C" ? ["scared_c"] : (() => {
      const formNumbers = [...new Set(Object.keys(result)
        .map((field) => field.match(/^scared_p_form_(\d+)_total$/)?.[1])
        .filter((number): number is string => Boolean(number)).map(Number))].sort((first, second) => first - second);
      return formNumbers.length ? formNumbers.map((number) => `scared_p_form_${number}`) : ["scared_p"];
    })();
    const tables = prefixes.flatMap((prefix): InstrumentReportTable[] => {
      const indicators = [
        { id: "total", label: "Pontuação total", cutoff: 25 },
        ...scaredCDomains.map((domain) => ({
          id: domain.id,
          label: domain.id === "panic_somatic" ? "Pânico/Sintomas somáticos"
            : domain.id === "separation_anxiety" ? "Ansiedade de separação" : domain.label,
          cutoff: domain.cutoff,
        })),
      ];
      const rows = indicators.flatMap((indicator) => {
        const field = indicator.id === "total" ? `${prefix}_total` : `${prefix}_${indicator.id}_score`;
        const score = Number(result[field]);
        return field in result && Number.isFinite(score) ? [[
          indicator.label, String(score), String(indicator.cutoff),
          score >= indicator.cutoff ? "Ponto de atenção" : "Abaixo do corte",
        ]] : [];
      });
      if (!rows.length) return [];
      const respondent = String(result[`${prefix}_respondent`] ?? "");
      const respondentLabel = ({ mother: "Mãe", father: "Pai", caregiver: "Cuidador(a)" }[respondent as "mother" | "father" | "caregiver"] ?? respondent) || "Não informado";
      const title = code === "SCARED-C" ? "SCARED-C — Escores e pontos de atenção"
        : `SCARED-P — Respondente ${prefix === "scared_p" ? 1 : prefix.match(/\d+$/)?.[0]} (${respondentLabel})`;
      return [{ kind: "matrix", title, headers: ["Dimensão", "Pontuação", "Ponto de corte", "Classificação"], rows }];
    });
    if (tables.length) return tables;
  }
  const tables: NonNullable<PresentationSchema["tables"]> = presentation.tables?.length
    ? presentation.tables
    : [{ title: "Resultados calculados", columns: Object.keys(result).map((id) => ({ id })) }];
  return tables.flatMap((table): InstrumentReportTable[] => {
    const fields = table.columns.filter((column) => column.id in result)
      .map((column) => ({ id: column.id, label: column.label ?? column.id, value: result[column.id] }));
    return fields.length ? [{ kind: "fields", title: table.title ?? "Resultados calculados", fields }] : [];
  });
}
