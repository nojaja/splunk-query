import { normalizeResults } from '../../src/utils/normalizeResults.js';

describe('normalizeResults', () => {
  it('converts fields/rows to objects', () => {
    const out = normalizeResults({ fields: ['a','b'], rows: [[1,2],[3,4]] });
    expect(out).toEqual([{ a:1, b:2 }, { a:3, b:4 }]);
  });
});
