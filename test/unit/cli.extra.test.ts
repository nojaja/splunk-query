import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mapErrorToExitCode, resolveQuery } from '../../src/cli';
import { SearchError } from '../../src/errors';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('cli extra branches', () => {
  // Given: CLI の追加分岐（stdin 読取や例外処理など）を検証する describe
  // When: null/undefined や fs の失敗など各種条件で呼び出す
  // Then: 期待するデフォルト値やエラーハンドリングが行われること
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mapErrorToExitCode returns 2 for null/undefined', () => {
    // Given（前提）: null/undefined が渡される
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: 2 が返る
    expect(mapErrorToExitCode(null)).toBe(2);
    expect(mapErrorToExitCode(undefined)).toBe(2);
  });

  it('mapErrorToExitCode returns 2 for unknown code', () => {
    // Given（前提）: code プロパティが未知の文字列の Error
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: 2 が返る
    const err: any = new Error('nope');
    err.code = 'UNKNOWN_CODE';
    expect(mapErrorToExitCode(err)).toBe(2);
  });

  it('mapErrorToExitCode handles SearchError without code', () => {
    // Given（前提）: SearchError だが code が未設定
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: 2 が返る
    const se = new SearchError('oops');
    expect(mapErrorToExitCode(se)).toBe(2);
  });

  it('resolveQuery reads from stdin when no options provided', async () => {
    // Given（前提）: オプションが空で stdin から読み取れる文字列がある
    // When（操作）: resolveQuery を呼ぶ
    // Then（期待）: stdin の内容が返る
    (fs.readFile as any).mockImplementation((arg: any) => {
      if (arg === 0) return Promise.resolve('from-stdin');
      return Promise.resolve('file');
    });
    const q = await resolveQuery({});
    expect(q).toBe('from-stdin');
    expect((fs.readFile as any)).toHaveBeenCalledWith(0 as any, 'utf-8');
  });

  it('resolveQuery returns empty string when stdin read fails', async () => {
    // Given（前提）: stdin の read が失敗する
    // When（操作）: resolveQuery を呼ぶ
    // Then（期待）: 空文字列が返る
    (fs.readFile as any).mockRejectedValue(new Error('nope'));
    const q = await resolveQuery({});
    expect(q).toBe('');
  });
});
