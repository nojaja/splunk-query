import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { writeCsv } from '../../src/output/csvWriter';

const TMP = path.resolve('./test/tmp-csv');

describe('csvWriter', () => {
  // Given: CSV 書き出しユーティリティのテスト
  // When: 空配列や特殊文字を含むデータを書き出す
  // Then: 期待される CSV 形式（空ファイル、ヘッダ、エスケープ等）が出力されること
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); });

  it('writes empty file for empty objects', async () => {
    // Given（前提）: 空配列を渡す
    // When（操作）: writeCsv を呼ぶ
    // Then（期待）: 空のファイルが生成される
    const file = path.join(TMP, 'e.csv');
    await writeCsv(file, [] as any);
    const txt = await fs.readFile(file, 'utf-8');
    expect(txt).toBe('');
  });

  it('handles null/array/object values', async () => {
    // Given（前提）: null/配列/オブジェクト/文字列を含むオブジェクト
    // When（操作）: writeCsv を呼ぶ
    // Then（期待）: ヘッダが含まれ、オブジェクトの値が適切に列に配置される
    const file = path.join(TMP, 'o.csv');
    await writeCsv(file, [{ a: null, b: [1], c: { x: 1 }, d: 'x' } as any]);
    const txt = await fs.readFile(file, 'utf-8');
    // header + one line
  const lines = txt.split('\n');
  expect(lines[0]).toContain('a,b,c,d');
  // last column value should be x (null/array/object are emitted empty)
  const cols = lines[1].split(',');
  expect(cols[3]).toBe('x');
  });

  it('escapes commas, newlines and quotes per RFC', async () => {
    // Given（前提）: カンマ、改行、引用符を含むフィールドを持つデータ
    // When（操作）: writeCsv を呼ぶ
    // Then（期待）: RFC に従ったエスケープが行われること
    const file = path.join(TMP, 'edges.csv');
    const objs = [{
      col1: 'a,b',
      col2: 'line\nbreak',
      col3: 'He said "Hello"',
    } as any];

    await writeCsv(file, objs);
    const txt = await fs.readFile(file, 'utf-8');

    // Should contain quoted comma field
    expect(txt).toEqual(expect.stringContaining('"a,b"'));

    // Should contain the newline inside a quoted field
    expect(txt).toEqual(expect.stringContaining('line\nbreak'));

    // Internal quotes must be doubled inside quoted field
    expect(txt).toEqual(expect.stringContaining('He said ""Hello""'));
  });
});
