import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';

describe('app.run stdout output', () => {
  beforeEach(() => { jest.restoreAllMocks(); });
  afterEach(() => { jest.resetAllMocks(); });

  it('writes json to stdout when out is not provided', async () => {
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    const res = await run({ query: 'x', format: 'json', service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
    const expected = JSON.stringify([{ a: 1 }], null, 2);
    expect(spy).toHaveBeenCalled();
    // last call should contain full JSON
    const calledWith = (spy.mock.calls[spy.mock.calls.length - 1] || [])[0];
    expect(String(calledWith)).toBe(expected);
  });

  it('writes csv to stdout when out is not provided', async () => {
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    const res = await run({ query: 'x', format: 'csv', service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
    expect(spy).toHaveBeenCalled();
    const calledWith = (spy.mock.calls[spy.mock.calls.length - 1] || [])[0];
    // CSV should include header and value on next line
    expect(String(calledWith)).toContain('a');
    expect(String(calledWith)).toContain('1');
    expect(String(calledWith)).toMatch(/a\n1/);
  });
});
