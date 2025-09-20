import { jest } from '@jest/globals';
import { run } from '../../src/app.js';
import fs from 'fs/promises';
import path from 'path';

describe('app.run', () => {
  const TMP = path.resolve('./test/tmp');
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); jest.resetAllMocks(); });

  it('calls service and writes json', async () => {
    const mockSvc = { /**
                       * モックのsearch関数
                       * @returns {Promise<object>} - 検索結果
                       */
    search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const out = path.join(TMP, 'o.json');
    const res = await run({ query: 'x', format: 'json', out, service: mockSvc });
    expect(res).toEqual([{ a:1 }]);
    const txt = await fs.readFile(out, 'utf-8');
    expect(JSON.parse(txt)).toEqual([{ a:1 }]);
  });
});
