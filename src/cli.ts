import { Command } from 'commander';
import fs from 'fs/promises';
import { run } from './app';
import { SplunkService } from './SplunkService';
import { getLogger } from './utils/logger';

const program = new Command();
program.option('-q, --query <query>')
  .option('--query-file <path>')
  .option('-o, --output <path>', 'output file')
  .option('-f, --format <fmt>', 'json|csv|console', 'json')
  .option('-u, --url <url>', 'Splunk base URL')
  .option('-t, --token <token>', 'Splunk auth token')
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
  if (opts.url || opts.token || opts.user || opts.password) {
    return new SplunkService({ baseUrl: opts.url, token: opts.token, username: opts.user, password: opts.password, verbose: opts.verbose, insecure: Boolean(opts.insecure) });
  }
  return undefined;
}

program.action(async (opts: any) => {
  const logger = getLogger(opts.verbose);
  const query = await resolveQuery(opts);
  try {
  const outPath = opts.output || 'out.json';
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
