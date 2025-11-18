import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';
import fs from 'fs/promises';
import path from 'path';

describe('app.run', () => {
  // Given（前提）: アプリケーションの run 関数のテストスコープ
  // When（操作）: サービスが1件の結果を返す状況
  // Then（期待）: JSONファイルに正しく書き込まれ、戻り値がオブジェクト配列になること
  const TMP = path.resolve('./test/tmp-app');
  beforeEach(async () => { await fs.mkdir(TMP, { recursive: true }); });
  afterEach(async () => { await fs.rm(TMP, { recursive: true, force: true }); jest.resetAllMocks(); });

  it('calls service and writes json', async () => {
    // Given（前提）: モックサービスが fields/rows を返す
    // When（操作）: run を json 出力先に対して実行する
    // Then（期待）: ファイルに JSON が書き込まれ、戻り値が期待する配列となる
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
