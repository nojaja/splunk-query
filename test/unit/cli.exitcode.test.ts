import { describe, it, expect } from '@jest/globals';
import { mapErrorToExitCode } from '../../src/cli';
import { SearchError } from '../../src/errors';

describe('CLI exit code mapping', () => {
  it('returns 3 for QUERY_REQUIRED', () => {
    const err = new SearchError('missing query', { code: 'QUERY_REQUIRED' });
    expect(mapErrorToExitCode(err)).toBe(3);
  });

  it('returns 4 for BASEURL_REQUIRED', () => {
    const err = new SearchError('missing baseurl', { code: 'BASEURL_REQUIRED' });
    expect(mapErrorToExitCode(err)).toBe(4);
  });

  it('returns 5 for NETWORK_ERROR', () => {
    const err = new SearchError('network', { code: 'NETWORK_ERROR' });
    expect(mapErrorToExitCode(err)).toBe(5);
  });

  it('returns 6 for SEARCH_FAILED', () => {
    const err = new SearchError('search failed', { code: 'SEARCH_FAILED' });
    expect(mapErrorToExitCode(err)).toBe(6);
  });

  it('returns 2 for unknown SearchError code', () => {
    const err = new SearchError('unknown', { code: 'FOO' });
    expect(mapErrorToExitCode(err)).toBe(2);
  });

  it('returns 2 for non-SearchError', () => {
    expect(mapErrorToExitCode(new Error('other'))).toBe(2);
  });
});
