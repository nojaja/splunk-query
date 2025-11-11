import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';
import fs from 'fs/promises';
import path from 'path';

describe('app.run', () => {
  const TMP = path.resolve('./test/tmp-app');
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); jest.resetAllMocks(); });

  it('calls service and writes json', async () => {
    const mockSvc: any = {
      // モックのsearch関数
      search: async () => ({ fields: ['a'], rows: [[1]] })
    };
    const out = path.join(TMP, 'o.json');
    const res = await run({ query: 'x', format: 'json', out, service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
    const txt = await fs.readFile(out, 'utf-8');
    expect(JSON.parse(txt)).toEqual([{ a: 1 }]);
  });
});
