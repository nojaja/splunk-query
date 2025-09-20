import fs from 'fs/promises';
import path from 'path';
import { writeCsv } from '../../src/output/csvWriter.js';
import { writeJson } from '../../src/output/jsonWriter.js';

const TMP = path.resolve('./test/tmp');

describe('writers', () => {
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); });

  it('writes json', async () => {
    const file = path.join(TMP, 'out.json');
    await writeJson(file, [{ a: 1 }]);
    const txt = await fs.readFile(file, 'utf-8');
    expect(JSON.parse(txt)).toEqual([{ a:1 }]);
  });

  it('writes csv', async () => {
    const file = path.join(TMP, 'out.csv');
    await writeCsv(file, [{ a: 1, b: 'x' }]);
    const txt = await fs.readFile(file, 'utf-8');
    expect(txt.split('\n')[0]).toBe('a,b');
  });
});
