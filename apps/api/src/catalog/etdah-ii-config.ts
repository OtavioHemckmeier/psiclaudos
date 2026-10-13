import type { InstrumentDefinitionConfig } from '@laudo/contracts';

/**
 * ETDAH-II (versão para professores) — registro de resultado externo.
 *
 * Cada professor respondente tem um formulário próprio. O profissional informa os pontos
 * brutos por fator (apurados no protocolo impresso) e, opcionalmente, transcreve o percentil,
 * a classificação e o escore Z da tabela normativa do manual para o grupo de referência escolhido.
 *
 * A plataforma NÃO calcula normas, percentis, classificações nem escores Z nesta versão,
 * e o preenchimento item a item está bloqueado: composição dos fatores, inversões, tabelas
 * normativas e enunciados dependem do manual (ver docs/instruments/etdah-ii.md).
 */
export const etdahIIFactors = [
  { id: 'attention', label: 'Atenção', items: 15 },
  { id: 'hyperactivity_impulsivity', label: 'Hiperatividade/Impulsividade', items: 12 },
  { id: 'learning', label: 'Aprendizagem', items: 13 },
  { id: 'social_behavior', label: 'Comportamento Social', items: 6 },
] as const;

export const etdahIIReferenceGroups = [
  { value: 'general', label: 'População geral' },
  { value: 'female_private', label: 'Feminino (Particular)' },
  { value: 'female_public', label: 'Feminino (Público)' },
  { value: 'male_private', label: 'Masculino (Particular)' },
  { value: 'male_public', label: 'Masculino (Público)' },
];

/** Limite de sanidade para o ponto bruto (6 alternativas por item); o intervalo exato depende do manual. */
export const etdahIIRawMaximum = (items: number) => items * 6;

export const ETDAH_II_FORM_COUNT = 10;

export const etdahIIForms = Array.from({ length: ETDAH_II_FORM_COUNT }, (_, index) => {
  const formNumber = index + 1;
  const prefix = `etdah_ii_form_${formNumber}`;
  return { formNumber, prefix };
});

export const etdahIIInstrument: InstrumentDefinitionConfig = {
  code: 'ETDAH-II',
  name: 'ETDAH-II — Versão para Professores',
  version: '3ed-2021-registro-externo-v1',
  formSchema: {
    sections: etdahIIForms.flatMap(({ formNumber, prefix }) => [
      {
        id: `${prefix}_identification`,
        title: `Formulário ${formNumber} — Professor respondente`,
        fields: [
          { id: `${prefix}_respondent`, type: 'TEXT' as const, label: 'Professor respondente', required: false },
          { id: `${prefix}_reference_group`, type: 'SINGLE_CHOICE' as const, label: 'Tabela de referência', required: false, options: etdahIIReferenceGroups },
        ],
      },
      {
        id: `${prefix}_factors`,
        title: `Formulário ${formNumber} — Fatores`,
        fields: etdahIIFactors.flatMap((factor) => [
          { id: `${prefix}_${factor.id}_raw`, type: 'NUMBER' as const, label: `${factor.label} — pontos brutos`, required: false },
          { id: `${prefix}_${factor.id}_percentile`, type: 'NUMBER' as const, label: `${factor.label} — percentil (manual)`, required: false },
          { id: `${prefix}_${factor.id}_classification`, type: 'TEXT' as const, label: `${factor.label} — classificação (manual)`, required: false },
          { id: `${prefix}_${factor.id}_z`, type: 'NUMBER' as const, label: `${factor.label} — escore Z (manual)`, required: false },
        ]),
      },
    ]),
  },
  // Sem correção automática nesta versão: os valores são validados e registrados pela API.
  rules: [],
  outputSchema: {
    fields: etdahIIForms.flatMap(({ formNumber, prefix }) => [
      { id: `${prefix}_respondent`, label: `Formulário ${formNumber} — Professor respondente`, type: 'TEXT' as const },
      { id: `${prefix}_reference_group`, label: `Formulário ${formNumber} — Tabela de referência`, type: 'TEXT' as const },
      ...etdahIIFactors.flatMap((factor) => [
        { id: `${prefix}_${factor.id}_raw`, label: `Formulário ${formNumber} — ${factor.label} — pontos brutos`, type: 'NUMBER' as const },
        { id: `${prefix}_${factor.id}_percentile`, label: `Formulário ${formNumber} — ${factor.label} — percentil`, type: 'NUMBER' as const },
        { id: `${prefix}_${factor.id}_classification`, label: `Formulário ${formNumber} — ${factor.label} — classificação`, type: 'TEXT' as const },
        { id: `${prefix}_${factor.id}_z`, label: `Formulário ${formNumber} — ${factor.label} — escore Z`, type: 'NUMBER' as const },
      ]),
    ]),
  },
  presentationSchema: {
    tables: [],
    // Gráfico só aparece quando o percentil foi transcrito; sem faixa esperada até a conferência do manual.
    charts: etdahIIForms.map(({ formNumber, prefix }) => ({
      title: `ETDAH-II — Formulário ${formNumber} — percentil por fator`,
      type: 'BAR' as const,
      maximum: 100,
      fields: etdahIIFactors.map((factor) => ({ id: `${prefix}_${factor.id}_percentile`, label: factor.label })),
    })),
  },
};
