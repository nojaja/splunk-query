import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SplunkService } from '../../src/SplunkService';

const TEST_BASE_URL = 'http://localhost';

describe('SplunkService', () => {
  // Given: SplunkService の主要機能を検証する describe
  // When: 様々な入力や内部動作を模倣したとき
  // Then: エラー・リトライ・正常系の返却値などが期待通りになること
  beforeEach(() => {
    jest.resetAllMocks();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when query missing', async () => {
    // Given（前提）: query 引数が未指定（undefined）で呼ばれるパターン
    // When（操作）: search を呼ぶ
    // Then（期待）: 'query required' を含む例外がスローされる
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    // 型チェックを回避して undefined を渡すパターンをテスト
    await expect((s as any).search()).rejects.toThrow('query required');
  });

  it('handles network error on submit', async () => {
    // Given（前提）: oneshotSearch のコールバックでネットワークエラーが返る
    // When（操作）: search を呼ぶ
    // Then（期待）: network error を示す例外に変換される
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    // _createService を差し替え、oneshotSearch のコールバックでエラーを返す
    (s as any)._createService = () => ({
      oneshotSearch: (_q: any, _opts: any, cb: any) => cb(new Error('net'), null)
    });
    await expect(s.search('foo')).rejects.toThrow('network error');
  });

  it('handles non-ok submit response', async () => {
    // Given（前提）: oneshotSearch がエラーを返す（非正常レスポンス）
    // When（操作）: search を呼ぶ
    // Then（期待）: 例外がスローされる
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    // oneshotSearch がパース不能な値を返すシナリオを模倣して例外を発生させる
    (s as any)._createService = () => ({
      oneshotSearch: (_q: any, _opts: any, cb: any) => cb(new Error('500'), null)
    });
    await expect(s.search('foo')).rejects.toThrow();
  });

  it('returns fields and rows on success', async () => {
    // Given（前提）: oneshotSearch が正常な JSON 結果を返す
    // When（操作）: search を呼ぶ
    // Then（期待）: fields/rows/results を含むオブジェクトが返る
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    (s as any)._createService = () => ({
      login: (cb: any) => cb(null, true),
      oneshotSearch: (_q: any, _opts: any, cb: any) => cb(null, JSON.stringify({ fields: ['a','b'], results: [{ a: 1, b: 2 }, { a:3, b:4 }] }))
    });
    const out = await s.search('foo');
    expect(out).toEqual({ fields: ['a','b'], rows: [[1,2],[3,4]], results: [{ a: 1, b: 2 }, { a:3, b:4 }] });
  });
});
