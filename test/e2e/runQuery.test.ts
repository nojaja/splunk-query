import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import CliRunner from './cliRunner';
import fs from 'fs/promises';
import path from 'path';

describe('CLI クエリ実行 (e2e)', () => {
  let runner: CliRunner;
  const root = process.cwd();
  const splPath = path.resolve(root, 'test.spl');
  const outPath = path.resolve(root, 'out.json');

  const expected = [
    { Name: 'Alice', Score: '70' },
    { Name: 'Bob', Score: '65' },
    { Name: 'Carol', Score: '80' },
  ];

  beforeEach(async () => {
    runner = new CliRunner();
    // create test.spl at repo root
    const content = `| makeresults format=csv \n` +
      `data="Name,Score\nAlice,70\nBob,65\nCarol,80"`;
    await fs.writeFile(splPath, content, 'utf-8');
    // remove existing out.json to ensure test starts clean
    try { await fs.unlink(outPath); } catch (e) { /* ignore */ }
  });

  afterEach(async () => {
    await runner.sendCtrlC(1000).catch(() => {});
    runner.dispose();
    try { await fs.unlink(splPath); } catch (e) { /* ignore */ }
    try { await fs.unlink(outPath); } catch (e) { /* ignore */ }
  });

  it('`test.spl` を使って実行し `out.json` が期待値になる', async () => {
    // start CLI
    runner.start(
      {
        command: process.execPath,
        args: [
          'dist/index.js',
          '--url',
          'https://localhost:8089/',
          '--user',
          'admin',
          '--password',
          'testpassword',
          '--query-file',
          'test.spl',
        ],
        cwd: root,
      },
      20000,
    );

    // wait some output (not strictly necessary but ensures CLI had time to run)
    await runner.readStdout().toLines(10000).catch(() => []);

    // small pause to ensure file write has completed
    await new Promise((r) => setTimeout(r, 500));

    const txt = await fs.readFile(outPath, 'utf-8');
    const actual = JSON.parse(txt);
    expect(actual).toEqual(expected);
  }, 30000);
});
