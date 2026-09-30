import type { InstrumentDefinitionConfig } from '@laudo/contracts';

const questions = [
  'Dormência ou formigamento',
  'Sensação de calor',
  'Tremores nas pernas',
  'Incapaz de relaxar',
  'Medo que aconteça o pior',
  'Atordoado ou tonto',
  'Palpitação ou aceleração do coração',
  'Sem equilíbrio',
  'Aterrorizado',
  'Nervoso',
  'Sensação de sufocação',
  'Tremores nas mãos',
  'Trêmulo',
  'Medo de perder o controle',
  'Dificuldade de respirar',
  'Medo de morrer',
  'Assustado',
  'Indigestão ou desconforto no abdômen',
  'Sensação de desmaio',
  'Rosto afogueado',
  'Sudorese',
];

const options = [
  { value: '0', label: 'Absolutamente Não' },
  { value: '1', label: 'Levemente' },
  { value: '2', label: 'Moderadamente' },
  { value: '3', label: 'Gravemente' },
];

export const baiInstrument: InstrumentDefinitionConfig = {
  code: 'BAI',
  name: 'BAI — Beck Anxiety Inventory',
  version: 'cunha-2001-escore-bruto-exportacao-v2',
  formSchema: {
    sections: [{
      id: 'bai_questions',
      title: 'Inventário de Ansiedade de Beck',
      fields: questions.map((question, index) => ({
        id: `bai_${index + 1}`,
        type: 'SINGLE_CHOICE' as const,
        label: `${index + 1}. ${question}`,
        required: true,
        options,
      })),
    }],
  },
  rules: [
    ...questions.map((_, index) => ({
      id: `bai_item_${index + 1}_score`,
      order: index + 1,
      type: 'SCORE_ITEM' as const,
      config: { field: `bai_${index + 1}`, mapping: { '0': 0, '1': 1, '2': 2, '3': 3 } },
      output: `bai_item_${index + 1}_score`,
    })),
    {
      id: 'bai_total_raw',
      order: 22,
      type: 'SUM' as const,
      config: { inputs: questions.map((_, index) => `bai_item_${index + 1}_score`) },
      output: 'bai_total_raw',
    },
    {
      id: 'bai_answered_items',
      order: 23,
      type: 'COUNT' as const,
      config: { inputs: questions.map((_, index) => `bai_item_${index + 1}_score`), condition: { operator: '>=', value: 0 } },
      output: 'bai_answered_items',
    },
  ],
  outputSchema: { fields: [{ id: 'bai_total_raw', label: 'Escore bruto total', type: 'NUMBER' }, { id: 'bai_answered_items', label: 'Itens respondidos', type: 'NUMBER' }] },
  presentationSchema: { tables: [{ title: 'BAI — resultado', columns: [{ id: 'bai_total_raw', label: 'Escore bruto total (0–63)' }, { id: 'bai_answered_items', label: 'Itens respondidos (0–21)' }] }], charts: [] },
};
