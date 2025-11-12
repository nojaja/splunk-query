import { Command } from 'commander';
import fs from 'fs/promises';
import { run } from './app';
import { SplunkService } from './SplunkService';
import { getLogger } from './utils/logger';
import { SearchError } from './errors';

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
/**
 * resolveQuery - コマンドライン引数、ファイル、または標準入力からクエリを解決します
 * @param opts コマンドラインオプションオブジェクト
 * @returns 解決されたクエリ文字列
 */
export async function resolveQuery(opts: any): Promise<string> {
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
 * buildService - コマンドラインオプション（優先）または環境変数から
 * SplunkService を構築して返します。
 * @param opts コマンドラインオプションオブジェクト
 * @returns SplunkService インスタンスまたは undefined
 */
export function buildService(opts: any) {
  // allow configuration via command-line options OR environment variables
  const baseUrl = opts.url || process.env.SPLUNK_URL;
  const token = opts.token || process.env.SPLUNK_TOKEN;
  const username = opts.user || process.env.SPLUNK_USER;
  const password = opts.password || process.env.SPLUNK_PASSWORD;
  const insecure = Boolean(opts.insecure) || process.env.SPLUNK_SKIP_TLS_VERIFY === '1';
  const verbose = opts.verbose;

  // If any connection detail is present (from CLI or env), construct service
  if (baseUrl || token || username || password) {
    return new SplunkService({ baseUrl, token, username, password, verbose, insecure });
  }
  return undefined;
}

const codeMapping: Record<string | number, number> = {
  QUERY_REQUIRED: 3,
  BASEURL_REQUIRED: 4,
  NETWORK_ERROR: 5,
  SEARCH_FAILED: 6,
};

/**
 * mapErrorToExitCode - エラーオブジェクトからプロセス終了コードを決定します
 * @param err エラーオブジェクト（SearchErrorやcodeプロパティを持つErrorなど）
 * @returns 数値の終了コード
 */
export function mapErrorToExitCode(err: any): number {
  if (!err) return 2;
  // Prefer explicit code property when present (supports plain Error with `.code` set)
  if (err.code) {
    return codeMapping[err.code] || 2;
  }
  // Fallback: if it's a SearchError without code, return generic
  if (err instanceof SearchError) return 2;
  return 2;
}
/**
 * cliAction - CLIの主要ロジックを実行し、終了コードを返します
 * @param opts コマンドラインオプション
 * @returns Promise<number> 終了コード
 */
export async function cliAction(opts: any): Promise<number> {
  const logger = getLogger(opts.verbose);
  const query = await resolveQuery(opts);
  try {
    const outPath = opts.file || undefined;
    const service = buildService(opts) as SplunkService | undefined;
    await run({ query, format: opts.format, out: outPath, service, verbose: opts.verbose });
    return 0;
  } catch (err: any) {
    logger.error('エラーが発生しました:', err && err.message ? err.message : String(err));
    if (opts.verbose) {
      logger.debug('詳細なエラー情報:', err && err.stack ? err.stack : 'no stack');
    }
    return mapErrorToExitCode(err);
  }
}

program.action(async (opts: any) => {
  const code = await cliAction(opts);
  process.exit(code);
});

// Avoid auto-running the CLI when this module is imported by tests
// Jest sets JEST_WORKER_ID; if present, skip parsing to prevent process.exit during unit tests
if (typeof process.env.JEST_WORKER_ID === 'undefined') {
  program.parse(process.argv);
}
