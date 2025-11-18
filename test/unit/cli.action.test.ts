import { describe, it, expect, jest } from '@jest/globals';
import { cliAction } from '../../src/cli';
import { run } from '../../src/app';

jest.mock('../../src/app');

describe('cliAction', () => {
  // Given: CLI のアクション実行結果を検証する describe
  // When: run の成功/失敗に応じた振る舞いをテスト
  // Then: 正しい終了コードが返ること
  it('returns 0 on success', async () => {
    // Given（前提）: run が正常終了する
    // When（操作）: cliAction を実行する
    // Then（期待）: 終了コード 0 が返る
  (run as any).mockResolvedValue([] as unknown);
    const code = await cliAction({ format: 'json', file: 'out.json', verbose: false });
    expect(code).toBe(0);
  });

  it('maps SearchError to exit code', async () => {
    // Given（前提）: run が SearchError を投げる
    // When（操作）: cliAction を実行する
    // Then（期待）: SearchError の code に基づく終了コードが返る
    const err: any = new Error('x');
    err.code = 'QUERY_REQUIRED';
  (run as any).mockRejectedValue(err);
    const code = await cliAction({ format: 'json', file: 'out.json', verbose: false });
    expect(code).toBe(3);
  });

  it('maps non-SearchError to default code', async () => {
    // Given（前提）: run が一般エラーを投げる
    // When（操作）: cliAction を実行する
    // Then（期待）: デフォルトの終了コードが返る
  (run as any).mockRejectedValue(new Error('boom'));
    const code = await cliAction({ format: 'json', file: 'out.json', verbose: false });
    expect(code).toBe(2);
  });
});
