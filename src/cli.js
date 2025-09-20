import { Command } from 'commander';
import fs from 'fs/promises';
import { run } from './app.js';
import { SplunkService } from './SplunkService.js';
import { getLogger } from './utils/logger.js';

const program = new Command();
program.option('-q, --query <query>')
  .option('--query-file <path>')
  .option('-f, --file <path>', 'output file')
  .option('--format <fmt>', 'json|csv|console', 'json')
  .option('--url <url>', 'Splunk base URL')
  .option('--token <token>', 'Splunk auth token')
  .option('--user <user>', 'Splunk username for management API')
  .option('--password <password>', 'Splunk password for management API')
  .option('--verbose', 'enable verbose logging');

/**
 * クエリを解決します（コマンドライン引数、ファイル、または標準入力から）
 * @param {object} opts - コマンドラインオプション
 * @returns {Promise<string>} - 解決されたクエリ
 */
async function resolveQuery(opts) {
  if (opts.query) return opts.query;
  if (opts.queryFile) return fs.readFile(opts.queryFile, 'utf-8');
  try {
    const stdin = await fs.readFile(0, 'utf-8');
    return stdin || '';
  } catch {
    return '';
  }
}

/**
 * コマンドラインオプションからSplunkServiceインスタンスを構築します
 * @param {object} opts - コマンドラインオプション
 * @returns {SplunkService|null} - SplunkServiceインスタンスまたはnull
 */
function buildService(opts) {
  if (opts.url || opts.token || opts.user || opts.password) {
    return new SplunkService({ baseUrl: opts.url, token: opts.token, username: opts.user, password: opts.password, verbose: opts.verbose });
  }
  return undefined;
}

program.action(async (opts) => {
  const logger = getLogger(opts.verbose);
  const query = await resolveQuery(opts);
  try {
    const outPath = opts.file || 'out.json';
    const service = buildService(opts);
    await run({ query, format: opts.format, out: outPath, service, verbose: opts.verbose });
    process.exit(0);
  } catch (err) {
    logger.error('エラーが発生しました:', err.message);
    if (opts.verbose) {
      logger.debug('詳細なエラー情報:', err.stack);
    }
    process.exit(2);
  }
});

if (process.argv.length > 2) program.parse(process.argv);
