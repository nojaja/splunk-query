import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { writeCsv } from '../../src/output/csvWriter';
import { writeJson } from '../../src/output/jsonWriter';

const TMP = path.resolve('./test/tmp');

describe('writers', () => {
  // Given: ファイル書き出し用の writer 関数群のテスト
  // When: JSON/C SV を指定して書き出す
  // Then: 期待するファイル内容が生成されること
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); });

  it('writes json', async () => {
    // Given（前提）: JSON 用データ配列
    // When（操作）: writeJson を呼ぶ
    // Then（期待）: ファイルに正しい JSON が書き込まれる
    const file = path.join(TMP, 'out.json');
    await writeJson(file, [{ a: 1 }]);
    const txt = await fs.readFile(file, 'utf-8');
    expect(JSON.parse(txt)).toEqual([{ a:1 }]);
  });

  it('writes csv', async () => {
    // Given（前提）: CSV 用データ配列
    // When（操作）: writeCsv を呼ぶ
    // Then（期待）: ヘッダ行が正しく出力される
    const file = path.join(TMP, 'out.csv');
    await writeCsv(file, [{ a: 1, b: 'x' }]);
    const txt = await fs.readFile(file, 'utf-8');
    expect(txt.split('\n')[0]).toBe('a,b');
  });
});
