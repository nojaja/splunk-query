import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import CliRunner from './cliRunner';

describe('CLI ヘルプ表示 (e2e)', () => {
  let runner: CliRunner;

  beforeEach(() => {
    runner = new CliRunner();
  });

  afterEach(async () => {
    try {
      // try graceful shutdown if still running
      await runner.sendCtrlC(500).catch(() => {});
    } catch (e) {
      // ignore
    }
    runner.dispose();
  });

  it('node dist\\index.js -h が期待するヘルプを出力する', async () => {
    // node 実行ファイルパスを明示的に使うと環境差異に強くなります
    runner.start({ command: process.execPath, args: ['dist/index.js', '-h'], cwd: process.cwd() }, 2000);

    const lines = await runner.readStdout().toLines(2000);
    const out = lines.join('\n');

    // 主要なヘルプ行を検証する
    expect(out).toEqual(expect.stringContaining('Usage: index [options]'));
    expect(out).toEqual(expect.stringContaining('--query <query>'));
    expect(out).toEqual(expect.stringContaining('--format'));
    expect(out).toEqual(expect.stringContaining('-h, --help'));
  }, 15000);
});
