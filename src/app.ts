import { SplunkService } from './SplunkService.js';
import { normalizeResults } from './utils/normalizeResults.js';
import { writeCsv } from './output/csvWriter.js';
import { writeJson } from './output/jsonWriter.js';
import { writeConsole } from './output/consoleWriter.js';
import { getLogger } from './utils/logger.js';

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
export async function run({ query, format='json', out, service, verbose } = {}) {
  const logger = getLogger(verbose);
  const svc = service || new SplunkService({ verbose });
  
  logger.progress('検索を開始します:', query);
  const res = await svc.search(query);
  const rows = normalizeResults(res);
  
  logger.progress(`${rows.length}件の結果を取得しました`);
  
  if (format === 'csv') {
    await writeCsv(out, rows);
    logger.success('CSV出力が完了しました:', out);
  } else if (format === 'console') {
    writeConsole(rows, verbose);
    logger.success('コンソール出力が完了しました');
  } else {
    await writeJson(out, rows);
    logger.success('JSON出力が完了しました:', out);
  }
  
  return rows;
}
