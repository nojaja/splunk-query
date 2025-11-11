import { jest, describe, it, expect } from '@jest/globals';
import { normalizeResults } from '../../src/utils/normalizeResults';

describe('normalizeResults extra', () => {
  it('handles results array of primitives and objects', () => {
    const out = normalizeResults({ results: [1, { a: 2 }] } as any);
    expect(out).toEqual([{ _raw: '1' }, { a: '2' }]);
  });

  it('handles rows without fields (arrays, objects, primitives)', () => {
    const rows = [ ['x','y'], { a: 1 }, 'raw' ];
    const out = normalizeResults({ rows } as any);
    expect(out).toEqual([{ _raw: 'x y' }, { a: 1 }, { _raw: 'raw' }]);
  });

  it('handles rows with fields for arrays and objects and nulls', () => {
    const fields = ['a','b','c'];
    const rows = [ [1, null, {x:1}], { a: 2, b: null, c: 3 } ];
    const out = normalizeResults({ fields, rows } as any);
    expect(out).toEqual([{ a: 1, b: '', c: '' }, { a: 2, b: '', c: 3 }]);
  });
});
