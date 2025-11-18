import { jest, describe, it, expect } from '@jest/globals';
import { normalizeResults } from '../../src/utils/normalizeResults';

describe('normalizeResults extra', () => {
  // Given: normalizeResults の拡張パターンを検証する describe
  // When: results/rows に多様な型が含まれる場合
  // Then: 期待される正規化結果が返ること
  it('handles results array of primitives and objects', () => {
    // Given（前提）: results 配列に primitive と object が混在
    // When（操作）: normalizeResults を呼ぶ
    // Then（期待）: primitive は _raw に、object は文字列化された値で返る
    const out = normalizeResults({ results: [1, { a: 2 }] } as any);
    expect(out).toEqual([{ _raw: '1' }, { a: '2' }]);
  });

  it('handles rows without fields (arrays, objects, primitives)', () => {
    // Given（前提）: fields 未定義で rows に配列/オブジェクト/プリミティブがある
    // When（操作）: normalizeResults を呼ぶ
    // Then（期待）: 配列は結合、オブジェクトはそのまま、プリミティブは _raw として返る
    const rows = [ ['x','y'], { a: 1 }, 'raw' ];
    const out = normalizeResults({ rows } as any);
    expect(out).toEqual([{ _raw: 'x y' }, { a: 1 }, { _raw: 'raw' }]);
  });

  it('handles rows with fields for arrays and objects and nulls', () => {
    // Given（前提）: fields と複数種の row 値（配列/オブジェクト/null）がある
    // When（操作）: normalizeResults を呼ぶ
    // Then（期待）: null は空文字、配列/オブジェクトはフィールドに割り当てられる
    const fields = ['a','b','c'];
    const rows = [ [1, null, {x:1}], { a: 2, b: null, c: 3 } ];
    const out = normalizeResults({ fields, rows } as any);
    expect(out).toEqual([{ a: 1, b: '', c: '' }, { a: 2, b: '', c: 3 }]);
  });
});
