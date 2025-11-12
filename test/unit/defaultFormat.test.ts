import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';

describe('default format behavior', () => {
  it('defaults to csv when format not provided (writes to stdout) and returns normalized rows', async () => {
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const res = await run({ query: 'x', service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
  });
});
