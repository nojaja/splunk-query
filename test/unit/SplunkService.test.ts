import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SplunkService } from '../../src/SplunkService';

const TEST_BASE_URL = 'http://localhost';

describe('SplunkService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when query missing', async () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    // 型チェックを回避して undefined を渡すパターンをテスト
    await expect((s as any).search()).rejects.toThrow('query required');
  });

  it('handles network error on submit', async () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    // _createService を差し替え、oneshotSearch のコールバックでエラーを返す
    (s as any)._createService = () => ({
      oneshotSearch: (_q: any, _opts: any, cb: any) => cb(new Error('net'), null)
    });
    await expect(s.search('foo')).rejects.toThrow('network error');
  });

  it('handles non-ok submit response', async () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    // oneshotSearch がパース不能な値を返すシナリオを模倣して例外を発生させる
    (s as any)._createService = () => ({
      oneshotSearch: (_q: any, _opts: any, cb: any) => cb(new Error('500'), null)
    });
    await expect(s.search('foo')).rejects.toThrow();
  });

  it('returns fields and rows on success', async () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    (s as any)._createService = () => ({
      login: (cb: any) => cb(null, true),
      oneshotSearch: (_q: any, _opts: any, cb: any) => cb(null, JSON.stringify({ fields: ['a','b'], results: [{ a: 1, b: 2 }, { a:3, b:4 }] }))
    });
    const out = await s.search('foo');
    expect(out).toEqual({ fields: ['a','b'], rows: [[1,2],[3,4]], results: [{ a: 1, b: 2 }, { a:3, b:4 }] });
  });
});
