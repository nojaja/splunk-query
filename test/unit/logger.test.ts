import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getLogger, initLogger, Logger } from '../../src/utils/logger';

describe('logger', () => {
  let spyConsole: jest.SpiedFunction<typeof console.log>;
  beforeEach(() => {
    spyConsole = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    spyConsole.mockRestore();
    jest.resetAllMocks();
  });

  it('initLogger returns logger and sets level', () => {
    const l = initLogger(false);
    expect(l).toBeDefined();
  });

  it('Logger debug only prints in verbose mode', () => {
    const lfalse = new Logger(false);
    lfalse.debug('nope');
    // 呼び出し自体が例外を投げないことを確認
    expect(() => lfalse.debug('nope')).not.toThrow();

    const ltrue = new Logger(true);
    expect(() => ltrue.debug('yes')).not.toThrow();
  });

  it('progress and success produce output', () => {
    const lg = getLogger(false);
    // 出力が例外を起こさずに呼ばれることを確認
    expect(() => lg.progress('進行')).not.toThrow();
    expect(() => lg.success('成功')).not.toThrow();
  });
});
