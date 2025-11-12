import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import CliRunner from './cliRunner';
import fs from 'fs/promises';
import path from 'path';
import { waitForSplunk } from './waitForSplunk';

describe('CLI 環境変数によるクエリ実行 (e2e)', () => {
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
    const content = `| makeresults format=csv \n` +
      `data="Name,Score\nAlice,70\nBob,65\nCarol,80"`;
    await fs.writeFile(splPath, content, 'utf-8');
    try { await fs.unlink(outPath); } catch (e) { /* ignore */ }
  });

  afterEach(async () => {
    await runner.sendCtrlC(1000).catch(() => {});
    runner.dispose();
    try { await fs.unlink(splPath); } catch (e) { /* ignore */ }
    try { await fs.unlink(outPath); } catch (e) { /* ignore */ }
  });

  it('環境変数で指定した接続情報を使用して実行し out.json が期待値になる', async () => {
  // wait for Splunk management port to be ready (docker container may take time to initialize)
  await waitForSplunk('localhost', 8089);

    // start CLI without --url/--user/--password; provide them via env
    runner.start(
      {
        command: process.execPath,
        args: ['dist/index.js', '--query-file', 'test.spl'],
        cwd: root,
        env: {
          // copy parent env to avoid losing PATH/node info
          ...(process.env || {}),
          SPLUNK_URL: 'https://localhost:8089/',
          SPLUNK_USER: 'admin',
          SPLUNK_PASSWORD: 'testpassword',
        },
      },
      20000,
    );

    // wait some output
    await runner.readStdout().toLines(10000).catch(() => []);

    // wait for out.json to appear (give the CLI up to 10s)
    const waitForFile = async (p: string, timeout = 10000) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        try {
          await fs.access(p);
          return;
        } catch (e) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      throw new Error(`file not found: ${p}`);
    };

    await waitForFile(outPath, 10000);
    const txt = await fs.readFile(outPath, 'utf-8');
    const actual = JSON.parse(txt);
    expect(actual).toEqual(expected);
  }, 120000);
});
