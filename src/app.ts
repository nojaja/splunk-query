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
 * 処理名: run - Splunk検索実行および出力処理
 * 処理概要: Splunk に対して検索を実行し、結果を正規化して指定された形式で出力する
 * 実装理由: CLI から検索結果を統一的に扱い、CSV/JSON/コンソールなど複数の出力先に柔軟に対応するため
 * @param {object} options - 実行オプション
 * @param {string} options.query - 検索クエリ
 * @param {string} options.format - 出力形式 ('json', 'csv', 'console')
 * @param {string} options.out - 出力ファイルパス
 * @param {SplunkService} options.service - Splunkサービスインスタンス
 * @param {boolean} options.verbose - 詳細ログ出力の有効/無効
 * @returns {Promise<Array>} - 正規化された検索結果
 */
export async function run({ query, format = 'csv', out, service, verbose }: RunOptions = {}) {
  const logger = getLogger(Boolean(verbose));
  const svc = service || new SplunkService({ verbose });
  
  logger.progress('検索を開始します:', query || '');
  const res = await svc.search(query || '');
  const rows = normalizeResults(res as any);
  
  logger.progress(`${rows.length}件の結果を取得しました`);
  
  if (format === 'csv') {
    await writeCsv(out as any, rows as any);
    logger.success('CSV出力が完了しました:', out || 'stdout');
  } else if (format === 'console') {
    writeConsole(rows as any, Boolean(verbose));
    logger.success('コンソール出力が完了しました');
  } else {
    await writeJson(out as any, rows as any);
    logger.success('JSON出力が完了しました:', out || 'stdout');
  }
  
  return rows;
}
