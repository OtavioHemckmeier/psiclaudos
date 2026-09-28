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

const snapIvQuestions = [
  { domain: 'Desatenção', label: 'Não consegue prestar muita atenção a detalhes ou comete erros por descuido nos trabalhos da escola ou tarefas' },
  { domain: 'Desatenção', label: 'Tem dificuldade de manter a atenção em tarefas ou atividades de lazer' },
  { domain: 'Desatenção', label: 'Parece não estar ouvindo quando se fala diretamente com ele' },
  { domain: 'Desatenção', label: 'Não segue instruções até o fim e não termina os deveres de escola, tarefas e obrigações' },
  { domain: 'Desatenção', label: 'Tem dificuldade para organizar tarefas e atividades' },
  { domain: 'Desatenção', label: 'Evita, não gosta ou se envolve contra a vontade em tarefas que exigem esforço mental prolongado' },
  { domain: 'Desatenção', label: 'Perde coisas necessárias para atividades (p. ex: brinquedos, deveres da escola, lápis ou livros)' },
  { domain: 'Desatenção', label: 'Distrai-se com estímulos externos' },
  { domain: 'Desatenção', label: 'É esquecido em atividades do dia-a-dia' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Mexe com as mãos ou pés ou se remexe na cadeira' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Sai do lugar na sala de aula ou em outras situações em que se espera que fique sentado' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Corre de um lado para outro ou sobe demais nas coisas em situações em que isto é inapropriado' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Tem dificuldade em brincar ou envolver-se em atividades de lazer de forma calma' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Não pára ou freqüentemente está a “mil por hora”' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Fala em excesso' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Responde as perguntas de forma precipitada antes delas terem sido terminadas' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Tem dificuldade de esperar sua vez' },
  { domain: 'Hiperatividade/Impulsividade', label: 'Interrompe os outros ou se intromete (por exemplo: intromete-se nas conversas, jogos, etc.)' },
  { domain: 'Oposição/Desafio', label: 'Descontrola-se' },
  { domain: 'Oposição/Desafio', label: 'Discute com adultos' },
  { domain: 'Oposição/Desafio', label: 'Desafia ativamente ou se recusa a atender pedidos ou regras de adultos' },
  { domain: 'Oposição/Desafio', label: 'Faz coisas de propósito que incomodam outras pessoas' },
  { domain: 'Oposição/Desafio', label: 'Culpa os outros pelos seus erros ou mau comportamento' },
  { domain: 'Oposição/Desafio', label: 'É irritável ou facilmente incomodado pelos outros' },
  { domain: 'Oposição/Desafio', label: 'É zangado ou ressentido' },
  { domain: 'Oposição/Desafio', label: 'É maldoso e vingativo' },
];

const snapIvResponseOptions = [
  { value: '0', label: 'Nem um pouco' },
  { value: '1', label: 'Só um pouco' },
  { value: '2', label: 'Bastante' },
  { value: '3', label: 'Demais' },
];

const snapIvClassificationRanges = {
  attention: [
    { min: 0, max: 12, result: 'Sintomas Não Significativos' },
    { min: 13, max: 17, result: 'Sintomas Leves' },
    { min: 18, max: 22, result: 'Sintomas Moderados' },
    { min: 23, max: 27, result: 'Sintomas Graves' },
  ],
  opposition: [
    { min: 0, max: 7, result: 'Sintomas Não Significativos' },
    { min: 8, max: 13, result: 'Sintomas Leves' },
    { min: 14, max: 18, result: 'Sintomas Moderados' },
    { min: 19, max: 24, result: 'Sintomas Graves' },
  ],
};

export function classifySnapIvScore(score: number, opposition: boolean) {
  const ranges = opposition ? snapIvClassificationRanges.opposition : snapIvClassificationRanges.attention;
  return ranges.find((range) => score >= range.min && score <= range.max)?.result ?? 'Sem classificação';
}

const snapIvForms = Array.from({ length: 20 }, (_, index) => index + 1).map((formNumber) => {
  const prefix = `snap_iv_form_${formNumber}`;
  const respondent = {
    id: `${prefix}_respondent`,
    type: 'SINGLE_CHOICE' as const,
    label: 'Respondente',
    required: false,
    options: [
      { value: 'self', label: 'Autorelato' },
      { value: 'mother', label: 'Mãe' },
      { value: 'father', label: 'Pai' },
      { value: 'teacher', label: 'Professor' },
    ],
  };
  const fields = snapIvQuestions.map((question, index) => ({
    id: `${prefix}_item_${index + 1}`,
    type: 'SINGLE_CHOICE' as const,
    label: `${index + 1}. ${question.label}`,
    required: false,
    options: snapIvResponseOptions,
  }));
  const sections = [
    { id: `${prefix}_respondent_section`, title: `Formulário ${formNumber} — Respondente`, fields: [respondent] },
    ...[
      { id: 'inattention', title: 'Desatenção', questions: snapIvQuestions.slice(0, 9), items: fields.slice(0, 9) },
      { id: 'hyperactivity_impulsivity', title: 'Hiperatividade/Impulsividade', questions: snapIvQuestions.slice(9, 18), items: fields.slice(9, 18) },
      { id: 'opposition_defiance', title: 'Oposição/Desafio', questions: snapIvQuestions.slice(18), items: fields.slice(18) },
    ].map((domain) => ({ id: `${prefix}_${domain.id}`, title: domain.title, fields: domain.items })),
  ];
  const scoreRules = [
    { suffix: 'inattention_score', items: fields.slice(0, 9), label: 'Desatenção' },
    { suffix: 'hyperactivity_impulsivity_score', items: fields.slice(9, 18), label: 'Hiperatividade/Impulsividade' },
    { suffix: 'opposition_defiance_score', items: fields.slice(18), label: 'Oposição/Desafio' },
  ];
  return { prefix, formNumber, respondent, fields, sections, scoreRules };
});

export const snapIvInstrument: InstrumentDefinitionConfig = {
  code: 'SNAP-IV',
  name: 'SNAP-IV',
  version: '26-itens-v2',
  formSchema: {
    sections: [
      ...snapIvForms.flatMap((form) => form.sections),
    ],
  },
  rules: snapIvForms.flatMap((form, formIndex) => form.scoreRules.flatMap((scoreRule, ruleIndex) => {
    const scoreOutput = `${form.prefix}_${scoreRule.suffix}`;
    return [
      {
        id: scoreOutput,
        order: formIndex * 6 + ruleIndex * 2 + 1,
        type: 'SUM' as const,
        config: { inputs: scoreRule.items.map((field) => field.id) },
        output: scoreOutput,
      },
      {
        id: `${scoreOutput}_classification`,
        order: formIndex * 6 + ruleIndex * 2 + 2,
        type: 'RANGE' as const,
        config: {
          input: scoreOutput,
          ranges: scoreRule.suffix === 'opposition_defiance_score'
            ? snapIvClassificationRanges.opposition
            : snapIvClassificationRanges.attention,
        },
        output: scoreOutput.replace(/_score$/, '_classification'),
      },
    ];
  })),
  outputSchema: {
    fields: snapIvForms.flatMap((form) => [
      { id: `${form.prefix}_respondent`, label: `Respondente — Formulário ${form.formNumber}`, type: 'TEXT' },
      ...form.scoreRules.flatMap((scoreRule) => [
        { id: `${form.prefix}_${scoreRule.suffix}`, label: `Formulário ${form.formNumber} — ${scoreRule.label} (soma)`, type: 'NUMBER' },
        { id: `${form.prefix}_${scoreRule.suffix.replace(/_score$/, '_classification')}`, label: `Formulário ${form.formNumber} — ${scoreRule.label} (classificação)`, type: 'TEXT' },
      ]),
    ]),
  },
  presentationSchema: {
    tables: snapIvForms.map((form) => ({
      title: `Formulário ${form.formNumber} — Soma das respostas por domínio`,
      columns: form.scoreRules.map((scoreRule) => ({ id: `${form.prefix}_${scoreRule.suffix}`, label: scoreRule.label })),
    })),
    charts: snapIvForms.map((form) => ({
      title: `Formulário ${form.formNumber} — Pontuação por domínio`,
      type: 'BAR' as const,
      maximum: 27,
      fields: form.scoreRules.map((scoreRule) => ({ id: `${form.prefix}_${scoreRule.suffix}`, label: scoreRule.label })),
    })),
  },
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
