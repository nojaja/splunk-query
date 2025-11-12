import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { resolveQuery, buildService } from '../../src/cli';
import { SplunkService } from '../../src/SplunkService';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('cli helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolveQuery returns opts.query when present', async () => {
    const q = await resolveQuery({ query: 'x' });
    expect(q).toBe('x');
  });

  it('resolveQuery reads queryFile when present', async () => {
  (fs.readFile as any).mockResolvedValue('file-contents');
    const q = await resolveQuery({ queryFile: 'p' });
    expect(q).toBe('file-contents');
    expect(fs.readFile).toHaveBeenCalledWith('p', 'utf-8');
  });

  it('buildService returns SplunkService when params provided', () => {
    const svc = buildService({ url: 'u', token: 't', user: undefined, password: undefined, verbose: true });
    expect(svc).toBeInstanceOf(SplunkService);
  });

  it('buildService returns undefined when no connection params', () => {
    const svc = buildService({});
    expect(svc).toBeUndefined();
  });
});
