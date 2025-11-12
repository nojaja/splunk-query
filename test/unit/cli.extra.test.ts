import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mapErrorToExitCode, resolveQuery } from '../../src/cli';
import { SearchError } from '../../src/errors';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('cli extra branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mapErrorToExitCode returns 2 for null/undefined', () => {
    expect(mapErrorToExitCode(null)).toBe(2);
    expect(mapErrorToExitCode(undefined)).toBe(2);
  });

  it('mapErrorToExitCode returns 2 for unknown code', () => {
    const err: any = new Error('nope');
    err.code = 'UNKNOWN_CODE';
    expect(mapErrorToExitCode(err)).toBe(2);
  });

  it('mapErrorToExitCode handles SearchError without code', () => {
    const se = new SearchError('oops');
    expect(mapErrorToExitCode(se)).toBe(2);
  });

  it('resolveQuery reads from stdin when no options provided', async () => {
    (fs.readFile as any).mockImplementation((arg: any) => {
      if (arg === 0) return Promise.resolve('from-stdin');
      return Promise.resolve('file');
    });
    const q = await resolveQuery({});
    expect(q).toBe('from-stdin');
    expect((fs.readFile as any)).toHaveBeenCalledWith(0 as any, 'utf-8');
  });

  it('resolveQuery returns empty string when stdin read fails', async () => {
    (fs.readFile as any).mockRejectedValue(new Error('nope'));
    const q = await resolveQuery({});
    expect(q).toBe('');
  });
});
