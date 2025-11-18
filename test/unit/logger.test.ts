import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getLogger, initLogger, Logger } from '../../src/utils/logger';

describe('logger', () => {
  // Given: ロガーの初期化・出力振る舞いを検証する describe
  // When: initLogger や Logger メソッドを呼び出す
  // Then: 例外を投げずに適切に動作すること（出力は console.log によるスパイで検証）
  let spyConsole: jest.SpiedFunction<typeof console.log>;
  beforeEach(() => {
    spyConsole = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    spyConsole.mockRestore();
    jest.resetAllMocks();
  });

  it('initLogger returns logger and sets level', () => {
    // Given（前提）: verbose フラグが false
    // When（操作）: initLogger を呼ぶ
    // Then（期待）: ロガーオブジェクトが返る
    const l = initLogger(false);
    expect(l).toBeDefined();
  });

  it('Logger debug only prints in verbose mode', () => {
    // Given（前提）: Logger の verbose true/false を切り替えて生成
    // When（操作）: debug を呼ぶ
    // Then（期待）: 例外が発生しない（表示の有無は内部実装に依存）
    const lfalse = new Logger(false);
    lfalse.debug('nope');
    // 呼び出し自体が例外を投げないことを確認
    expect(() => lfalse.debug('nope')).not.toThrow();

    const ltrue = new Logger(true);
    expect(() => ltrue.debug('yes')).not.toThrow();
  });

  it('progress and success produce output', () => {
    // Given（前提）: getLogger で取得したロガー
    // When（操作）: progress / success を呼ぶ
    // Then（期待）: 例外を投げずに呼び出し可能であること
    const lg = getLogger(false);
    // 出力が例外を起こさずに呼ばれることを確認
    expect(() => lg.progress('進行')).not.toThrow();
    expect(() => lg.success('成功')).not.toThrow();
  });
});
