import { Command } from 'commander';
import fs from 'fs/promises';
import { run } from './app';
import { SplunkService } from './SplunkService';
import { getLogger } from './utils/logger';

const program = new Command();
program.option('-q, --query <query>')
  .option('--query-file <path>')
  .option('-f, --file <path>', 'output file')
  .option('--format <fmt>', 'json|csv|console', 'json')
  .option('--url <url>', 'Splunk base URL')
  .option('--token <token>', 'Splunk auth token')
  .option('--user <user>', 'Splunk username for management API')
  .option('--password <password>', 'Splunk password for management API')
  .option('--verbose', 'enable verbose logging')
  .option('--insecure', 'skip TLS certificate verification (development only)');

/**
 * クエリを解決します（コマンドライン引数、ファイル、または標準入力から）
 * @param {object} opts - コマンドラインオプション
 * @returns {Promise<string>} - 解決されたクエリ
 */
async function resolveQuery(opts: any): Promise<string> {
  if (opts.query) return opts.query;
  if (opts.queryFile) return fs.readFile(opts.queryFile, 'utf-8');
  try {
    const stdin = await fs.readFile(0 as any, 'utf-8');
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
function buildService(opts: any) {
  // allow configuration via command-line options OR environment variables
  const baseUrl = opts.url || process.env.SPLUNK_URL;
  const token = opts.token || process.env.SPLUNK_TOKEN;
  const username = opts.user || process.env.SPLUNK_USER;
  const password = opts.password || process.env.SPLUNK_PASSWORD;
  const insecure = Boolean(opts.insecure) || process.env.SPLUNK_SKIP_TLS_VERIFY === '1';
  const verbose = opts.verbose;

  if (baseUrl || token || username || password) {
    return new SplunkService({ baseUrl, token, username, password, verbose, insecure });
  }
  return undefined;
}

program.action(async (opts: any) => {
  const logger = getLogger(opts.verbose);
  const query = await resolveQuery(opts);
  try {
    const outPath = opts.file || 'out.json';
    const service = buildService(opts) as SplunkService | undefined;
    await run({ query, format: opts.format, out: outPath, service, verbose: opts.verbose });
    process.exit(0);
  } catch (err: any) {
    logger.error('エラーが発生しました:', err && err.message ? err.message : String(err));
    if (opts.verbose) {
      logger.debug('詳細なエラー情報:', err && err.stack ? err.stack : 'no stack');
    }
    process.exit(2);
  }
});

program.parse(process.argv);
