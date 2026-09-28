import type { InstrumentDefinitionConfig } from '@laudo/contracts';

const questions = [
  'Quando fico com medo, tenho dificuldade para respirar.',
  'Tenho dor de cabeça quando estou na escola.',
  'Não gosto de ficar com pessoas que não conheço bem.',
  'Tenho medo de dormir fora de casa.',
  'Preocupo-me se as outras pessoas gostam de mim.',
  'Quando fico com medo, sinto que vou desmaiar.',
  'Sinto-me nervoso(a).',
  'Acompanho minha mãe ou meu pai aonde quer que vão.',
  'As pessoas dizem que pareço nervoso(a).',
  'Fico nervoso(a) perto de pessoas que não conheço bem.',
  'Tenho dor de barriga quando estou na escola.',
  'Quando fico com medo, sinto como se estivesse enlouquecendo.',
  'Preocupo-me em dormir sozinho(a).',
  'Preocupo-me em ser tão bom/boa quanto outras crianças.',
  'Quando fico com medo, sinto que as coisas não são reais.',
  'Tenho pesadelos de que algo ruim aconteça aos meus pais.',
  'Preocupo-me em ir para a escola.',
  'Quando fico com medo, meu coração bate depressa.',
  'Sinto tremores.',
  'Tenho pesadelos de que algo ruim aconteça comigo.',
  'Preocupo-me se as coisas vão dar certo para mim.',
  'Quando fico com medo, suo muito.',
  'Preocupo-me muito com as coisas.',
  'Fico muito assustado(a) sem motivo aparente.',
  'Tenho medo de ficar sozinho(a) em casa.',
  'É difícil conversar com pessoas que não conheço bem.',
  'Quando fico com medo, sinto como se estivesse sufocando.',
  'As pessoas dizem que me preocupo demais.',
  'Não gosto de ficar longe da minha família.',
  'Tenho medo de ter crises de ansiedade ou pânico.',
  'Preocupo-me que algo ruim aconteça aos meus pais.',
  'Sinto vergonha perto de pessoas que não conheço bem.',
  'Preocupo-me com o que vai acontecer no futuro.',
  'Quando fico com medo, sinto vontade de vomitar.',
  'Preocupo-me com meu desempenho nas coisas que faço.',
  'Tenho medo de ir para a escola.',
  'Preocupo-me com coisas que já aconteceram.',
  'Quando fico com medo, sinto tontura.',
  'Fico nervoso(a) ao fazer algo enquanto outras crianças ou adultos me observam, como ler em voz alta, falar, brincar ou praticar esporte.',
  'Fico nervoso(a) ao ir a festas ou lugares onde haverá pessoas que não conheço bem.',
  'Sou tímido(a).',
];

const domains = [
  { id: 'panic_somatic', label: 'Pânico/somático', items: [1, 6, 9, 12, 15, 18, 19, 22, 24, 27, 30, 34, 38], cutoff: 7 },
  { id: 'generalized_anxiety', label: 'Ansiedade generalizada', items: [5, 7, 14, 21, 23, 28, 33, 35, 37], cutoff: 9 },
  { id: 'separation_anxiety', label: 'Separação', items: [4, 8, 13, 16, 20, 25, 29, 31], cutoff: 5 },
  { id: 'social_anxiety', label: 'Ansiedade social', items: [3, 10, 26, 32, 39, 40, 41], cutoff: 8 },
  { id: 'school_avoidance', label: 'Evitação escolar', items: [2, 11, 17, 36], cutoff: 3 },
];

const options = [
  { value: '0', label: 'Não é verdade ou quase nunca é verdade' },
  { value: '1', label: 'Às vezes é verdade' },
  { value: '2', label: 'É verdade ou quase sempre é verdade' },
];

const scoreRanges = (maximum: number, cutoff: number) => [
  { min: 0, max: cutoff - 1, result: 'Abaixo do ponto de atenção' },
  { min: cutoff, max: maximum, result: 'Ponto de atenção para investigação' },
];

export const scaredCDomains = domains;

export const scaredCInstrument: InstrumentDefinitionConfig = {
  code: 'SCARED-C',
  name: 'SCARED-C',
  version: '41-itens-pt-traducao-provisoria-v1',
  formSchema: {
    sections: [
      { id: 'child_report', title: 'Como você se sentiu nos últimos 3 meses', fields: questions.map((question, index) => ({
        id: `scared_c_${index + 1}`,
        type: 'SINGLE_CHOICE' as const,
        label: `${index + 1}. ${question}`,
        required: true,
        options,
      })) },
    ],
  },
  rules: [
    { id: 'scared_c_total', order: 1, type: 'SUM', config: { inputs: questions.map((_, index) => `scared_c_${index + 1}`) }, output: 'scared_c_total' },
    { id: 'scared_c_total_screen', order: 2, type: 'RANGE', config: { input: 'scared_c_total', ranges: scoreRanges(82, 25) }, output: 'scared_c_total_screen' },
    ...domains.flatMap((domain, index) => [
      { id: `scared_c_${domain.id}_score`, order: index * 2 + 3, type: 'SUM' as const, config: { inputs: domain.items.map((number) => `scared_c_${number}`) }, output: `scared_c_${domain.id}_score` },
      { id: `scared_c_${domain.id}_screen`, order: index * 2 + 4, type: 'RANGE' as const, config: { input: `scared_c_${domain.id}_score`, ranges: scoreRanges(domain.items.length * 2, domain.cutoff) }, output: `scared_c_${domain.id}_screen` },
    ]),
  ],
  outputSchema: {
    fields: [
      { id: 'scared_c_total', label: 'Escore total', type: 'NUMBER' },
      { id: 'scared_c_total_screen', label: 'Indicador total', type: 'TEXT' },
      ...domains.flatMap((domain) => [
        { id: `scared_c_${domain.id}_score`, label: `${domain.label} — escore`, type: 'NUMBER' as const },
        { id: `scared_c_${domain.id}_screen`, label: `${domain.label} — indicador`, type: 'TEXT' as const },
      ]),
    ],
  },
  presentationSchema: {
    tables: [{ title: 'SCARED-C — escores de rastreamento', columns: [
      { id: 'scared_c_total', label: 'Total (0–82)' },
      ...domains.map((domain) => ({ id: `scared_c_${domain.id}_score`, label: `${domain.label} (0–${domain.items.length * 2})` })),
    ] }],
    charts: [{ title: 'SCARED-C — pontuação por domínio', type: 'BAR', fields: domains.map((domain) => ({ id: `scared_c_${domain.id}_score`, label: domain.label })) }],
  },
};
