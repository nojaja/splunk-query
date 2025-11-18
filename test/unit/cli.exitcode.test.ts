import { describe, it, expect } from '@jest/globals';
import { mapErrorToExitCode } from '../../src/cli';
import { SearchError } from '../../src/errors';

describe('CLI exit code mapping', () => {
  // Given: mapErrorToExitCode のマッピングを確認する describe
  // When: 各種エラーオブジェクトを渡したとき
  // Then: 期待する終了コードが返ること
  it('returns 3 for QUERY_REQUIRED', () => {
    // Given（前提）: QUERY_REQUIRED の SearchError
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: 3 が返る
    const err = new SearchError('missing query', { code: 'QUERY_REQUIRED' });
    expect(mapErrorToExitCode(err)).toBe(3);
  });

  it('returns 4 for BASEURL_REQUIRED', () => {
    // Given（前提）: BASEURL_REQUIRED の SearchError
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: 4 が返る
    const err = new SearchError('missing baseurl', { code: 'BASEURL_REQUIRED' });
    expect(mapErrorToExitCode(err)).toBe(4);
  });

  it('returns 5 for NETWORK_ERROR', () => {
    // Given（前提）: NETWORK_ERROR の SearchError
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: 5 が返る
    const err = new SearchError('network', { code: 'NETWORK_ERROR' });
    expect(mapErrorToExitCode(err)).toBe(5);
  });

  it('returns 6 for SEARCH_FAILED', () => {
    // Given（前提）: SEARCH_FAILED の SearchError
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: 6 が返る
    const err = new SearchError('search failed', { code: 'SEARCH_FAILED' });
    expect(mapErrorToExitCode(err)).toBe(6);
  });

  it('returns 2 for unknown SearchError code', () => {
    // Given（前提）: 未知のコードを持つ SearchError
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: デフォルトの 2 が返る
    const err = new SearchError('unknown', { code: 'FOO' });
    expect(mapErrorToExitCode(err)).toBe(2);
  });

  it('returns 2 for non-SearchError', () => {
    // Given（前提）: SearchError ではない Error
    // When（操作）: mapErrorToExitCode を呼ぶ
    // Then（期待）: デフォルトの 2 が返る
    expect(mapErrorToExitCode(new Error('other'))).toBe(2);
  });
});
