import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { writeCsv } from '../../src/output/csvWriter';

const TMP = path.resolve('./test/tmp-csv');

describe('csvWriter', () => {
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); });

  it('writes empty file for empty objects', async () => {
    const file = path.join(TMP, 'e.csv');
    await writeCsv(file, [] as any);
    const txt = await fs.readFile(file, 'utf-8');
    expect(txt).toBe('');
  });

  it('handles null/array/object values', async () => {
    const file = path.join(TMP, 'o.csv');
    await writeCsv(file, [{ a: null, b: [1], c: { x: 1 }, d: 'x' } as any]);
    const txt = await fs.readFile(file, 'utf-8');
    // header + one line
    const lines = txt.split('\n');
    expect(lines[0]).toContain('a,b,c,d');
    expect(lines[1]).toContain('"x"');
  });
});
