import type { InstrumentDefinitionConfig } from '@laudo/contracts';

const asrsResponseOptions = [
  { value: 'never', label: 'Nunca' },
  { value: 'rarely', label: 'Raramente' },
  { value: 'sometimes', label: 'Às vezes' },
  { value: 'often', label: 'Frequentemente' },
  { value: 'very_often', label: 'Muito frequentemente' },
];

const asrsQuestions = [
  'Com que frequência você comete erros por falta de atenção quando tem de trabalhar num projeto chato ou difícil?',
  'Com que frequência você tem dificuldade para manter a atenção quando está fazendo um trabalho chato ou repetitivo?',
  'Com que frequência você tem dificuldade para se concentrar no que as pessoas dizem, mesmo quando elas estão falando diretamente com você?',
  'Com que frequência você deixa um projeto pela metade depois de já ter feito as partes mais difíceis?',
  'Com que frequência você tem dificuldade para fazer um trabalho que exija organização?',
  'Quando você precisa fazer algo que exija muita concentração, com que frequência você evita ou adia o início?',
  'Com que frequência você coloca as coisas fora do lugar ou tem dificuldade de encontrar as coisas em casa ou no trabalho?',
  'Com que frequência você se distrai com atividades ou barulho à sua volta?',
  'Com que frequência você tem dificuldade para lembrar-se de compromissos ou obrigações?',
  'Com que frequência você fica se mexendo na cadeira ou balançando as mãos ou os pés quando precisa ficar sentado(a) por muito tempo?',
  'Com que frequência você se levanta da cadeira em reuniões ou em outras situações onde deveria ficar sentado(a)?',
  'Com que frequência você se sente inquieto(a) ou agitado(a)?',
  'Com que frequência você tem dificuldade para sossegar e relaxar quando tem tempo livre para você?',
  'Com que frequência você se pega falando demais em situações sociais?',
  'Com que frequência você se sente ativo(a) demais e necessitando fazer coisas, como se estivesse “com o motor ligado”?',
  'Quando você está conversando, com que frequência você se pega terminando as frases das pessoas antes delas?',
  'Com que frequência você tem dificuldade para esperar nas situações onde cada um tem a sua vez?',
  'Com que frequência você interrompe os outros quando eles estão ocupados?',
];

const asrsFields = asrsQuestions.map((label, index) => ({
  id: `asrs_${index + 1}`,
  type: 'SINGLE_CHOICE' as const,
  label: `${index + 1}. ${label}`,
  required: true,
  options: asrsResponseOptions,
}));

const asrsScoreRules = asrsQuestions.map((_, index) => ({
  id: `asrs_score_${index + 1}`,
  order: index + 1,
  type: 'SCORE_ITEM' as const,
  config: {
    field: `asrs_${index + 1}`,
    mapping: { never: 0, rarely: 1, sometimes: 2, often: 3, very_often: 4 },
  },
  output: `asrs_score_${index + 1}`,
}));

export const demoInstrument: InstrumentDefinitionConfig = {
  code: 'DEMO-CORRECAO',
  name: 'Instrumento demonstrativo de correção',
  version: '1.0.0',
  formSchema: { sections: [{ id: 'main', title: 'Dados demonstrativos', fields: [{ id: 'item_1', type: 'SINGLE_CHOICE', label: 'Item demonstrativo', required: true, options: [{ value: 'never', label: 'Nunca' }, { value: 'often', label: 'Frequentemente' }] }] }] },
  rules: [{ id: 'score_item_1', order: 1, type: 'SCORE_ITEM', config: { field: 'item_1', mapping: { never: 0, often: 1 } }, output: 'item_1_score' }],
  outputSchema: { fields: [{ id: 'item_1_score', label: 'Pontuação do item', type: 'NUMBER' }] },
  presentationSchema: { tables: [{ title: 'Resultados calculados', columns: [{ id: 'item_1_score', label: 'Pontuação do item' }] }], charts: [{ title: 'Distribuição de pontuação', type: 'BAR', fields: [{ id: 'item_1_score', label: 'Pontuação do item' }] }] },
};

export const asrs18Instrument: InstrumentDefinitionConfig = {
  code: 'ASRS-18',
  name: 'ASRS-18',
  version: '1.2-br',
  formSchema: {
    sections: [
      { id: 'inattention', title: 'Parte A (Desatenção)', fields: asrsFields.slice(0, 9) },
      { id: 'hyperactivity_impulsivity', title: 'Parte B (Hiperatividade/Impulsividade)', fields: asrsFields.slice(9) },
    ],
  },
  rules: [
    ...asrsScoreRules,
    {
      id: 'inattention_symptom_count',
      order: 19,
      type: 'COUNT',
      config: {
        inputs: asrsScoreRules.slice(0, 9).map((rule) => rule.output),
        condition: { operator: '>=', value: 3 },
      },
      output: 'inattention_symptom_count',
    },
    {
      id: 'hyperactivity_impulsivity_symptom_count',
      order: 20,
      type: 'COUNT',
      config: {
        inputs: asrsScoreRules.slice(9).map((rule) => rule.output),
        condition: { operator: '>=', value: 3 },
      },
      output: 'hyperactivity_impulsivity_symptom_count',
    },
    {
      id: 'inattention_classification',
      order: 21,
      type: 'CONDITIONAL',
      config: {
        condition: { field: 'inattention_symptom_count', operator: '>=', value: 6 },
        then: 'Indicativo de TDAH',
        else: 'Abaixo do ponto de corte de rastreio',
      },
      output: 'inattention_classification',
    },
    {
      id: 'hyperactivity_impulsivity_classification',
      order: 22,
      type: 'CONDITIONAL',
      config: {
        condition: { field: 'hyperactivity_impulsivity_symptom_count', operator: '>=', value: 6 },
        then: 'Indicativo de TDAH',
        else: 'Abaixo do ponto de corte de rastreio',
      },
      output: 'hyperactivity_impulsivity_classification',
    },
  ],
  outputSchema: {
    fields: [
      { id: 'inattention_symptom_count', label: 'Parte A (Desatenção) — Pontuação', type: 'NUMBER' },
      { id: 'inattention_classification', label: 'Parte A (Desatenção) — Classificação', type: 'TEXT' },
      { id: 'hyperactivity_impulsivity_symptom_count', label: 'Parte B (Hiperatividade/Impulsividade) — Pontuação', type: 'NUMBER' },
      { id: 'hyperactivity_impulsivity_classification', label: 'Parte B (Hiperatividade/Impulsividade) — Classificação', type: 'TEXT' },
    ],
  },
  presentationSchema: {
    tables: [{
      title: 'Resultados por domínio',
      columns: [
        { id: 'inattention_symptom_count', label: 'Parte A (Desatenção)' },
        { id: 'inattention_classification', label: 'Classificação' },
        { id: 'hyperactivity_impulsivity_symptom_count', label: 'Parte B (Hiperatividade/Impulsividade)' },
        { id: 'hyperactivity_impulsivity_classification', label: 'Classificação' },
      ],
    }],
    charts: [{
      title: 'Distribuição por domínio',
      type: 'BAR',
      maximum: 9,
      expectedRange: '0 a 4',
      fields: [
        { id: 'inattention_symptom_count', label: 'Parte A (Desatenção)' },
        { id: 'hyperactivity_impulsivity_symptom_count', label: 'Parte B (Hiperatividade/Impulsividade)' },
      ],
    }],
  },
};
