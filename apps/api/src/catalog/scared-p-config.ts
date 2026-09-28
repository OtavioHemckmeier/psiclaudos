import type { InstrumentDefinitionConfig } from '@laudo/contracts';
import { scaredCDomains } from './scared-c-config';

const questions = [
  'Quando está com medo meu filho/a tem dificuldade para respirar.',
  'Meu filho/a tem dor de cabeça quando está na escola.',
  'Meu filho/a não gosta de estar com pessoas que não conhece direito.',
  'Meu filho/a fica com medo quando dorme fora de casa.',
  'Meu filho/a se preocupa em relação aos outros gostarem dele/a.',
  'Quando meu filho/a está assustado/a parece que vai desmaiar.',
  'Meu filho/a é nervoso/a.',
  'Meu filho/a me segue aonde quer que eu vá.',
  'As pessoas me dizem que meu filho/a parece nervoso/a.',
  'Meu filho/a fica nervoso/a com pessoas que não conhece direito.',
  'Meu filho/a tem dor de estômago na escola.',
  'Quando meu filho/a se assusta, parece que vai enlouquecer.',
  'Meu filho/a se preocupa em ter que dormir sozinho/a.',
  'Meu filho/a se preocupa em ser tão bom/a quanto as outras crianças.',
  'Quando meu filho/a se assusta, parece que as coisas não são reais.',
  'Meu filho/a tem pesadelos de que algo ruim aconteça com seus pais.',
  'Meu filho/a se preocupa sobre ir à escola.',
  'Quando meu filho/a se assusta, seu coração bate rápido.',
  'Ele/a fica trêmulo/a.',
  'Meu filho/a tem pesadelos de que algo ruim possa lhe acontecer.',
  'Meu filho/a se preocupa sobre as coisas darem certo para ele/a.',
  'Quando se assusta, meu filho/a sua bastante.',
  'Meu filho/a vive preocupado/a.',
  'Meu filho/a fica muito assustado/a sem motivo algum.',
  'Meu filho/a fica com medo de ficar em casa sozinho/a.',
  'Meu filho/a tem dificuldade para falar com pessoas que não conhece.',
  'Quando se assusta, meu filho/a parece que vai sufocar.',
  'As pessoas me dizem que meu filho/a se preocupa demais.',
  'Meu filho/a não gosta de estar longe da família.',
  'Meu filho/a tem medo de ter crises de ansiedade (ou de pânico).',
  'Meu filho/a se preocupa que algo ruim possa acontecer com seus pais.',
  'Meu filho/a sente-se tímido/a com pessoas que não conhece direito.',
  'Meu filho/a se preocupa com o que vai acontecer no futuro.',
  'Quando fica assustado/a, meu filho/a parece que vai vomitar.',
  'Meu filho/a se preocupa com quão bem faz as coisas.',
  'Meu filho/a tem medo de ir à escola.',
  'Meu filho/a se preocupa com coisas que já aconteceram.',
  'Quando se assusta, meu filho/a fica tonto/a.',
  'Meu filho/a fica nervoso/a quando está com outras crianças ou adultos e tem que fazer alguma coisa com eles lhe olhando (ex.: falar, ler, jogar alguma coisa, praticar algum esporte).',
  'Meu filho/a fica nervoso/a quando vai a festas, bailes ou qualquer lugar onde vai haver pessoas que não conhece.',
  'Meu filho/a é tímido/a.',
];

const options = [
  { value: '0', label: 'Nunca ou quase nunca' },
  { value: '1', label: 'Às vezes' },
  { value: '2', label: 'Frequentemente' },
];

const scoreRanges = (maximum: number, cutoff: number) => [
  { min: 0, max: cutoff - 1, result: 'Abaixo do ponto de atenção' },
  { min: cutoff, max: maximum, result: 'Ponto de atenção para investigação' },
];

const forms = Array.from({ length: 20 }, (_, index) => {
  const formNumber = index + 1;
  const prefix = `scared_p_form_${formNumber}`;
  const respondent = {
    id: `${prefix}_respondent`, type: 'SINGLE_CHOICE' as const, label: 'Quem está respondendo?', required: false,
    options: [
      { value: 'mother', label: 'Mãe' },
      { value: 'father', label: 'Pai' },
      { value: 'caregiver', label: 'Cuidador(a)' },
    ],
  };
  const items = questions.map((question, itemIndex) => ({
    id: `${prefix}_item_${itemIndex + 1}`,
    type: 'SINGLE_CHOICE' as const,
    label: `${itemIndex + 1}. ${question}`,
    required: false,
    options,
  }));
  return { formNumber, prefix, respondent, items };
});

export const scaredPInstrument: InstrumentDefinitionConfig = {
  code: 'SCARED-P',
  name: 'SCARED-P',
  version: '41-itens-pt-fornecido-v2',
  formSchema: {
    sections: forms.flatMap((form) => [
      { id: `${form.prefix}_respondent_section`, title: `Formulário ${form.formNumber} — Respondente`, fields: [form.respondent] },
      { id: `${form.prefix}_questions`, title: `Formulário ${form.formNumber} — Como a criança se sentiu nos últimos 3 meses`, fields: form.items },
    ]),
  },
  rules: forms.flatMap((form, formIndex) => [
    { id: `${form.prefix}_total`, order: formIndex * 12 + 1, type: 'SUM' as const, config: { inputs: form.items.map((item) => item.id) }, output: `${form.prefix}_total` },
    { id: `${form.prefix}_total_screen`, order: formIndex * 12 + 2, type: 'RANGE' as const, config: { input: `${form.prefix}_total`, ranges: scoreRanges(82, 25) }, output: `${form.prefix}_total_screen` },
    ...scaredCDomains.flatMap((domain, domainIndex) => [
      { id: `${form.prefix}_${domain.id}_score`, order: formIndex * 12 + domainIndex * 2 + 3, type: 'SUM' as const, config: { inputs: domain.items.map((number) => `${form.prefix}_item_${number}`) }, output: `${form.prefix}_${domain.id}_score` },
      { id: `${form.prefix}_${domain.id}_screen`, order: formIndex * 12 + domainIndex * 2 + 4, type: 'RANGE' as const, config: { input: `${form.prefix}_${domain.id}_score`, ranges: scoreRanges(domain.items.length * 2, domain.cutoff) }, output: `${form.prefix}_${domain.id}_screen` },
    ]),
  ]),
  outputSchema: {
    fields: forms.flatMap((form) => [
      { id: `${form.prefix}_respondent`, label: `Formulário ${form.formNumber} — Respondente`, type: 'TEXT' as const },
      { id: `${form.prefix}_total`, label: `Formulário ${form.formNumber} — Escore total`, type: 'NUMBER' as const },
      { id: `${form.prefix}_total_screen`, label: `Formulário ${form.formNumber} — Indicador total`, type: 'TEXT' as const },
      ...scaredCDomains.flatMap((domain) => [
        { id: `${form.prefix}_${domain.id}_score`, label: `Formulário ${form.formNumber} — ${domain.label} — escore`, type: 'NUMBER' as const },
        { id: `${form.prefix}_${domain.id}_screen`, label: `Formulário ${form.formNumber} — ${domain.label} — indicador`, type: 'TEXT' as const },
      ]),
    ]),
  },
  presentationSchema: {
    tables: forms.map((form) => ({ title: `SCARED-P — Formulário ${form.formNumber}`, columns: [
      { id: `${form.prefix}_total`, label: 'Total (0–82)' },
      ...scaredCDomains.map((domain) => ({ id: `${form.prefix}_${domain.id}_score`, label: `${domain.label} (0–${domain.items.length * 2})` })),
    ] })),
    charts: forms.map((form) => ({ title: `SCARED-P — Formulário ${form.formNumber} — pontuação por domínio`, type: 'BAR' as const, fields: scaredCDomains.map((domain) => ({ id: `${form.prefix}_${domain.id}_score`, label: domain.label })) })),
  },
};
