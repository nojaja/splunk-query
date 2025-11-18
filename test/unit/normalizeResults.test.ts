import { describe, it, expect } from '@jest/globals';
import { normalizeResults } from '../../src/utils/normalizeResults';

describe('normalizeResults', () => {
  // Given: Splunk からの fields/rows 形式を正規化する関数のテスト
  // When: fields と rows を与えると
  // Then: キーを持つオブジェクト配列に変換されること
  it('converts fields/rows to objects', () => {
    // Given（前提）: fields と rows が与えられる
    // When（操作）: normalizeResults を呼ぶ
    // Then（期待）: フィールド名に対応するオブジェクト配列が返る
    const out = normalizeResults({ fields: ['a','b'], rows: [[1,2],[3,4]] });
    expect(out).toEqual([{ a:1, b:2 }, { a:3, b:4 }]);
  });
});
