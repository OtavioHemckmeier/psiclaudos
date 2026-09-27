import { describe, expect, it } from 'vitest';
import { executeRules, validateRules } from '../src/index';

describe('rule engine', () => {
  it('executes score, sum and range rules', () => {
    const result = executeRules([
      { id: 'score_q1', order: 1, type: 'SCORE_ITEM', config: { field: 'q1', mapping: { often: 1, never: 0 } }, output: 'q1_score' },
      { id: 'score_q2', order: 2, type: 'SCORE_ITEM', config: { field: 'q2', mapping: { often: 1, never: 0 } }, output: 'q2_score' },
      { id: 'total', order: 3, type: 'SUM', config: { inputs: ['q1_score', 'q2_score'] }, output: 'total' },
      { id: 'classification', order: 4, type: 'RANGE', config: { input: 'total', ranges: [{ min: 0, max: 1, result: 'LOW' }, { min: 2, max: 2, result: 'HIGH' }] }, output: 'classification' },
    ], { q1: 'often', q2: 'often' });

    expect(result.errors).toEqual([]);
    expect(result.outputs.total).toBe(2);
    expect(result.outputs.classification).toBe('HIGH');
    expect(result.trace).toHaveLength(4);
  });

  it('detects duplicate outputs', () => {
    const messages = validateRules([
      { id: 'one', order: 1, type: 'SUM', config: {}, output: 'total' },
      { id: 'two', order: 2, type: 'SUM', config: {}, output: 'total' },
    ]);
    expect(messages.some((message) => message.code === 'DUPLICATE_OUTPUT')).toBe(true);
  });

  it('evaluates restricted mathematical formulas', () => {
    const result = executeRules([
      { id: 'percentage', order: 1, type: 'FORMULA', config: { expression: '(score / max_score) * 100', inputs: ['score', 'max_score'] }, output: 'percentage' },
    ], { score: 3, max_score: 4 });
    expect(result.errors).toEqual([]);
    expect(result.outputs.percentage).toBe(75);
  });

  it('rejects unsupported rules and invalid formulas', () => {
    const messages = validateRules([
      { id: 'unknown', order: 1, type: 'UNKNOWN' as never, config: {}, output: 'x' },
      { id: 'bad_formula', order: 2, type: 'FORMULA', config: { expression: 'score +', inputs: ['score'] }, output: 'y' },
    ]);
    expect(messages.some((message) => message.code === 'UNSUPPORTED_RULE')).toBe(true);
    expect(messages.some((message) => message.code === 'INVALID_FORMULA')).toBe(true);
  });

  it('detects circular dependencies between calculated outputs', () => {
    const messages = validateRules([
      { id: 'a', order: 1, type: 'SUM', config: { inputs: ['b'] }, output: 'a' },
      { id: 'b', order: 2, type: 'SUM', config: { inputs: ['a'] }, output: 'b' },
    ]);
    expect(messages.some((message) => message.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
  });
});
