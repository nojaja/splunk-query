import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import CliRunner from './cliRunner';
import fs from 'fs/promises';
import path from 'path';

describe('CLI デフォルトフォーマット (e2e)', () => {
  let runner: CliRunner;
  const root = process.cwd();
  const splPath = path.resolve(root, 'test.spl');
  const outPath = path.resolve(root, 'out.json');

  beforeEach(async () => {
    runner = new CliRunner();
    // create test.spl at repo root with CSV payload
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

  it('--format 未指定時に CSV 出力になる (out.json に CSV が書かれる)', async () => {
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

    await runner.readStdout().toLines(10000).catch(() => []);
    // small pause to ensure file write has completed
    await new Promise((r) => setTimeout(r, 500));

    const txt = await fs.readFile(outPath, 'utf-8');
    // Expect CSV: header line contains Name,Score
    const firstLine = txt.split('\n')[0];
    expect(firstLine).toContain('Name');
    expect(firstLine).toContain('Score');
  }, 30000);
});
