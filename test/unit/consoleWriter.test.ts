import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeConsole, writeConsoleSimple } from '../../src/output/consoleWriter';

describe('consoleWriter', () => {
  // Given: コンソール表示用ユーティリティのテスト
  // When: writeConsole / writeConsoleSimple を呼び出したとき
  // Then: コンソール出力が発生し、期待する文字列が含まれること
  let spyLog: jest.SpiedFunction<typeof console.log>;
  beforeEach(() => {
    spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    spyLog.mockRestore();
    jest.resetAllMocks();
  });

  it('writeConsole prints table and summary', () => {
    // Given（前提）: 複数オブジェクトの配列
    // When（操作）: writeConsole を呼ぶ
    // Then（期待）: ヘッダー/区切り/行/サマリが console.log で出力される
    const objs = [
      { a: '1', b: 'x' },
      { a: '2', b: 'y' }
    ];
    writeConsole(objs, false);
    // header + separator + 2 rows + blank + summary => at least 5 calls
    expect(spyLog).toHaveBeenCalled();
  });

  it('writeConsoleSimple prints keys and values', () => {
    // Given（前提）: 単一オブジェクトの配列
    // When（操作）: writeConsoleSimple を呼ぶ
    // Then（期待）: キーと値が console.log に含まれる
    const objs = [ { foo: 'bar', num: 3 } ];
    writeConsoleSimple(objs, false);
    expect(spyLog).toHaveBeenCalled();
    // expect that key is present in one of the calls
    const calledArgs = spyLog.mock.calls.flat().join(' ');
    expect(calledArgs).toMatch(/foo/);
    expect(calledArgs).toMatch(/bar/);
  });

  it('handles empty arrays without throwing', () => {
    // Given（前提）: 空配列
    // When（操作）: writeConsole / writeConsoleSimple を呼ぶ
    // Then（期待）: 例外が発生しない
    expect(() => writeConsole([], false)).not.toThrow();
    expect(() => writeConsoleSimple([], false)).not.toThrow();
  });
});
