import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';
import fs from 'fs/promises';
import path from 'path';
import { writeConsole } from '../../src/output/consoleWriter';

describe('app.run extra', () => {
  const TMP = path.resolve('./test/tmp-app-extra');
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); jest.resetAllMocks(); });

  it('throws when csv selected but out missing', async () => {
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    await expect(run({ query: 'x', format: 'csv', service: mockSvc })).rejects.toThrow('out file path required for csv');
  });

  it('writes csv when out provided', async () => {
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const out = path.join(TMP, 'o.csv');
    const res = await run({ query: 'x', format: 'csv', out, service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
    const txt = await fs.readFile(out, 'utf-8');
    expect(txt.startsWith('a')).toBe(true);
  });

  it('console format calls writeConsole', async () => {
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const spy = jest.spyOn(require('../../src/output/consoleWriter'), 'writeConsole');
    await run({ query: 'x', format: 'console', service: mockSvc });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('throws when json selected but out missing', async () => {
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    await expect(run({ query: 'x', format: 'json', service: mockSvc })).rejects.toThrow('out file path required for json');
  });
});
