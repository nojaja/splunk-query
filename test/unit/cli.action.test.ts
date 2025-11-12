import { describe, it, expect, jest } from '@jest/globals';
import { cliAction } from '../../src/cli';
import { run } from '../../src/app';

jest.mock('../../src/app');

describe('cliAction', () => {
  it('returns 0 on success', async () => {
  (run as any).mockResolvedValue([] as unknown);
    const code = await cliAction({ format: 'json', file: 'out.json', verbose: false });
    expect(code).toBe(0);
  });

  it('maps SearchError to exit code', async () => {
    const err: any = new Error('x');
    err.code = 'QUERY_REQUIRED';
  (run as any).mockRejectedValue(err);
    const code = await cliAction({ format: 'json', file: 'out.json', verbose: false });
    expect(code).toBe(3);
  });

  it('maps non-SearchError to default code', async () => {
  (run as any).mockRejectedValue(new Error('boom'));
    const code = await cliAction({ format: 'json', file: 'out.json', verbose: false });
    expect(code).toBe(2);
  });
});
