import { jest } from '@jest/globals';
import { SplunkService } from '../../src/SplunkService.js';

const TEST_BASE_URL = 'http://localhost';

describe('SplunkService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when query missing', async () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    await expect(s.search()).rejects.toThrow('query required');
  });

  it('handles network error on submit', async () => {
    global.fetch.mockRejectedValueOnce(new Error('net'));
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    await expect(s.search('foo')).rejects.toThrow('network error');
  });

  it('handles non-ok submit response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    await expect(s.search('foo')).rejects.toThrow('search submit failed');
  });

  it('returns fields and rows on success', async () => {
    const jobResp = { sid: 'S1' };
    const resultsResp = { fields: ['a','b'], results: [{ a: 1, b: 2 }, { a:3, b:4 }] };
    global.fetch
      .mockResolvedValueOnce({ 
        ok: true, 
        /**
         * モックのtext関数
         * @returns {Promise<string>} - 空文字列
         */
        text: async () => '',  // 空のtext
        /**
         * モックのjson関数
         * @returns {Promise<object>} - ジョブレスポンス
         */
        json: async () => jobResp  // jsonでsidを返す
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        /**
         * モックのjson関数（結果）
         * @returns {Promise<object>} - 結果レスポンス
         */
        json: async () => resultsResp 
      });
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'a', password: 'b' });
    const out = await s.search('foo');
    expect(out).toEqual({ fields: ['a','b'], rows: [[1,2],[3,4]], results: [{ a: 1, b: 2 }, { a:3, b:4 }] });
  });
});
