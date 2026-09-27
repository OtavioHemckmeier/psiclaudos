import type { InstrumentDefinitionConfig } from '@laudo/contracts';

export const demoInstrument: InstrumentDefinitionConfig = {
  code: 'DEMO-CORRECAO',
  name: 'Instrumento demonstrativo de correção',
  version: '1.0.0',
  formSchema: { sections: [{ id: 'main', title: 'Dados demonstrativos', fields: [{ id: 'item_1', type: 'SINGLE_CHOICE', label: 'Item demonstrativo', required: true, options: [{ value: 'never', label: 'Nunca' }, { value: 'often', label: 'Frequentemente' }] }] }] },
  rules: [{ id: 'score_item_1', order: 1, type: 'SCORE_ITEM', config: { field: 'item_1', mapping: { never: 0, often: 1 } }, output: 'item_1_score' }],
  outputSchema: { fields: [{ id: 'item_1_score', label: 'Pontuação do item', type: 'NUMBER' }] },
  presentationSchema: { tables: [{ title: 'Resultados calculados', columns: [{ id: 'item_1_score', label: 'Pontuação do item' }] }], charts: [{ title: 'Distribuição de pontuação', type: 'BAR', fields: [{ id: 'item_1_score', label: 'Pontuação do item' }] }] },
};
