import type { InstrumentDefinitionConfig } from '@laudo/contracts';

/**
 * BDI-II — registro da pontuação de cada item transcrita do caderno impresso.
 * Apenas os títulos dos sintomas são exibidos; os enunciados do caderno não são reproduzidos.
 * Classificação de gravidade, domínios e normas ficam bloqueados até a conferência do manual
 * (ver docs/instruments/bdi-ii-br.md).
 */
export const bdiIIItems = [
  'Tristeza',
  'Pessimismo',
  'Fracassos passados',
  'Perda de prazer',
  'Sentimentos de culpa',
  'Sentimentos de punição',
  'Autoestima',
  'Autocrítica',
  'Pensamentos ou desejos suicidas',
  'Choro',
  'Agitação',
  'Perda de interesse',
  'Indecisão',
  'Desvalorização',
  'Falta de energia',
  'Alterações do padrão de sono',
  'Irritabilidade',
  'Alterações de apetite',
  'Dificuldade de concentração',
  'Cansaço ou fadiga',
  'Perda de interesse por sexo',
];

/** Itens cujo caderno usa alternativas com letras (1a/1b, 2a/2b, 3a/3b). */
const lettered = new Set([16, 18]);

const options = ['0', '1', '2', '3'].map((value) => ({ value, label: value }));

export const BDI_II_ITEM_COUNT = bdiIIItems.length;
export const BDI_II_MAX_SCORE = BDI_II_ITEM_COUNT * 3;

export const bdiIIInstrument: InstrumentDefinitionConfig = {
  code: 'BDI-II',
  name: 'BDI-II — Inventário de Depressão de Beck',
  version: 'br-registro-escore-bruto-v1',
  formSchema: {
    sections: [{
      id: 'bdi_ii_questions',
      title: 'BDI-II — pontuação de cada item (transcrita do caderno de respostas)',
      fields: bdiIIItems.map((item, index) => {
        const number = index + 1;
        return {
          id: `bdi_ii_${number}`,
          type: 'SINGLE_CHOICE' as const,
          label: `${number}. ${item}${lettered.has(number) ? ' (registre o número: 1a/1b = 1, 2a/2b = 2, 3a/3b = 3)' : ''}`,
          required: true,
          options,
        };
      }),
    }],
  },
  rules: [
    ...bdiIIItems.map((_, index) => ({
      id: `bdi_ii_item_${index + 1}_score`,
      order: index + 1,
      type: 'SCORE_ITEM' as const,
      config: { field: `bdi_ii_${index + 1}`, mapping: { '0': 0, '1': 1, '2': 2, '3': 3 } },
      output: `bdi_ii_item_${index + 1}_score`,
    })),
    {
      id: 'bdi_ii_total_raw',
      order: BDI_II_ITEM_COUNT + 1,
      type: 'SUM' as const,
      config: { inputs: bdiIIItems.map((_, index) => `bdi_ii_item_${index + 1}_score`) },
      output: 'bdi_ii_total_raw',
    },
  ],
  outputSchema: {
    fields: [
      { id: 'bdi_ii_total_raw', label: 'Escore bruto total', type: 'NUMBER' },
      { id: 'bdi_ii_item_9_score', label: 'Item 9 — pensamentos ou desejos suicidas', type: 'NUMBER' },
    ],
  },
  presentationSchema: {
    tables: [{ title: 'BDI-II — resultado', columns: [{ id: 'bdi_ii_total_raw', label: 'Escore bruto total (0–63)' }] }],
    charts: [],
  },
};
