import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeConsole } from '../../src/output/consoleWriter';

describe('consoleWriter extra', () => {
  let spy: jest.SpiedFunction<typeof console.log>;
  beforeEach(() => { spy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { spy.mockRestore(); jest.resetAllMocks(); });

  it('inserts blank line after 10 rows', () => {
    const rows = [] as any[];
    for (let i = 0; i < 12; i++) rows.push({ a: i, b: `v${i}` });
    writeConsole(rows, false);
    // expect at least one empty string logged as blank separator
    const calls = spy.mock.calls.map(c => c[0]);
    expect(calls).toContain('');
  });
});
