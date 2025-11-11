import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeConsole, writeConsoleSimple } from '../../src/output/consoleWriter';

describe('consoleWriter', () => {
  let spyLog: jest.SpiedFunction<typeof console.log>;
  beforeEach(() => {
    spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    spyLog.mockRestore();
    jest.resetAllMocks();
  });

  it('writeConsole prints table and summary', () => {
    const objs = [
      { a: '1', b: 'x' },
      { a: '2', b: 'y' }
    ];
    writeConsole(objs, false);
    // header + separator + 2 rows + blank + summary => at least 5 calls
    expect(spyLog).toHaveBeenCalled();
  });

  it('writeConsoleSimple prints keys and values', () => {
    const objs = [ { foo: 'bar', num: 3 } ];
    writeConsoleSimple(objs, false);
    expect(spyLog).toHaveBeenCalled();
    // expect that key is present in one of the calls
    const calledArgs = spyLog.mock.calls.flat().join(' ');
    expect(calledArgs).toMatch(/foo/);
    expect(calledArgs).toMatch(/bar/);
  });

  it('handles empty arrays without throwing', () => {
    expect(() => writeConsole([], false)).not.toThrow();
    expect(() => writeConsoleSimple([], false)).not.toThrow();
  });
});
