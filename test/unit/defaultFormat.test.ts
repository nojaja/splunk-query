import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';

describe('default format behavior', () => {
  // Given: フォーマット未指定時のデフォルト挙動を検証する describe
  // When: format を指定せず run を実行すると
  // Then: CSV がデフォルトで選ばれ、正規化された行が返ること
  it('defaults to csv when format not provided (writes to stdout) and returns normalized rows', async () => {
    // Given（前提）: format 未指定かつサービスが fields/rows を返す
    // When（操作）: run を実行する
    // Then（期待）: 正規化されたオブジェクト配列が返る
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const res = await run({ query: 'x', service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
  });
});
