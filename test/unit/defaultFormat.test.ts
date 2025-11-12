import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';

describe('default format behavior', () => {
  it('defaults to csv when format not provided (throws out-file required)', async () => {
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    await expect(run({ query: 'x', service: mockSvc })).rejects.toThrow('out file path required for csv');
  });
});
