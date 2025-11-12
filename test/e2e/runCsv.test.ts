import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import CliRunner from './cliRunner';
import fs from 'fs/promises';
import path from 'path';

describe('CLI CSV 出力 (e2e)', () => {
	let runner: CliRunner;
	const root = process.cwd();
	const splPath = path.resolve(root, 'test-csv.spl');
	const outPath = path.resolve(root, 'out.csv');

	beforeEach(async () => {
		runner = new CliRunner();
		// prepare a makeresults search that contains tricky CSV values
		const data = 'Name,Notes\n"A,One","line\nbreak"\n"B","He said ""Hello"""';
		const content = `| makeresults format=csv \n` + `data="${data.replace(/"/g, '\\"')}"`;
		await fs.writeFile(splPath, content, 'utf-8');
		try { await fs.unlink(outPath); } catch (e) { /* ignore */ }
	});

	afterEach(async () => {
		await runner.sendCtrlC(1000).catch(() => {});
		runner.dispose();
		try { await fs.unlink(splPath); } catch (e) { /* ignore */ }
		try { await fs.unlink(outPath); } catch (e) { /* ignore */ }
	});

	it('generates RFC-escaped CSV file from query results', async () => {
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
					'test-csv.spl',
					'--format',
					'csv',
					'--file',
					'out.csv',
				],
				cwd: root,
			},
			20000,
		);

		// wait for output and file write
		await runner.readStdout().toLines(10000).catch(() => []);
		await new Promise((r) => setTimeout(r, 500));

		const txt = await fs.readFile(outPath, 'utf-8');

		// check that comma-containing cell is quoted
		expect(txt).toEqual(expect.stringContaining('"A,One"'));
		// check newline-containing cell preserved inside quotes
		expect(txt).toEqual(expect.stringContaining('line\nbreak'));
		// check internal quotes doubled
		expect(txt).toEqual(expect.stringContaining('He said ""Hello""'));
	}, 30000);
});
