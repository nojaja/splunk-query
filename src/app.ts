import { SplunkService } from './SplunkService';
import { normalizeResults } from './utils/normalizeResults';
import { writeCsv } from './output/csvWriter';
import { writeJson } from './output/jsonWriter';
import { writeConsole } from './output/consoleWriter';
import { getLogger } from './utils/logger';

export interface RunOptions {
  query?: string;
  format?: 'json' | 'csv' | 'console';
  out?: string;
  service?: SplunkService;
  verbose?: boolean;
}

/**
 * Splunk検索を実行し、指定された形式で結果を出力します
 * @param {object} options - 実行オプション
 * @param {string} options.query - 検索クエリ
 * @param {string} options.format - 出力形式 ('json', 'csv', 'console')
 * @param {string} options.out - 出力ファイルパス
 * @param {SplunkService} options.service - Splunkサービスインスタンス
 * @param {boolean} options.verbose - 詳細ログ出力の有効/無効
 * @returns {Promise<Array>} - 正規化された検索結果
 */
export async function run({ query, format = 'json', out, service, verbose }: RunOptions = {}) {
  const logger = getLogger(Boolean(verbose));
  const svc = service || new SplunkService({ verbose });
  
  logger.progress('検索を開始します:', query || '');
  const res = await svc.search(query || '');
  const rows = normalizeResults(res as any);
  
  logger.progress(`${rows.length}件の結果を取得しました`);
  
  if (format === 'csv') {
    if (!out) throw new Error('out file path required for csv');
    await writeCsv(out, rows as any);
    logger.success('CSV出力が完了しました:', out);
  } else if (format === 'console') {
    writeConsole(rows as any, Boolean(verbose));
    logger.success('コンソール出力が完了しました');
  } else {
    if (!out) throw new Error('out file path required for json');
    await writeJson(out, rows as any);
    logger.success('JSON出力が完了しました:', out);
  }
  
  return rows;
}
