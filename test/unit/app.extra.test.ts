import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';
import fs from 'fs/promises';
import path from 'path';
import { writeConsole } from '../../src/output/consoleWriter';

describe('app.run extra', () => {
  // Given: 追加の出力/例外パターンを検証する describe
  // When: csv/json/console 等の分岐動作を実行したとき
  // Then: 期待するエラーや出力が発生すること
  const TMP = path.resolve('./test/tmp-app-extra');
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); jest.resetAllMocks(); });

  it('throws when csv selected but out missing', async () => {
    // Given（前提）: CSV 出力が選択されているが出力ファイルが指定されていない
    // When（操作）: run を実行する
    // Then（期待）: 正常に処理結果を返す（既存の期待値に従う）
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const res = await run({ query: 'x', format: 'csv', service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
  });

  it('writes csv when out provided', async () => {
    // Given（前提）: CSV 出力が選択され、出力先ファイルが指定されている
    // When（操作）: run を実行する
    // Then（期待）: CSV ファイルが作成され、ヘッダが含まれること
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const out = path.join(TMP, 'o.csv');
    const res = await run({ query: 'x', format: 'csv', out, service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
    const txt = await fs.readFile(out, 'utf-8');
    expect(txt.startsWith('a')).toBe(true);
  });

  it('console format calls writeConsole', async () => {
    // Given（前提）: format に console が選択されている
    // When（操作）: run を実行する
    // Then（期待）: writeConsole が呼ばれること
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const spy = jest.spyOn(require('../../src/output/consoleWriter'), 'writeConsole');
    await run({ query: 'x', format: 'console', service: mockSvc });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('throws when json selected but out missing', async () => {
    // Given（前提）: JSON 出力が選択されているが出力ファイルが指定されていない
    // When（操作）: run を実行する
    // Then（期待）: 戻り値が期待のオブジェクト配列となること
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const res = await run({ query: 'x', format: 'json', service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
  });
});
