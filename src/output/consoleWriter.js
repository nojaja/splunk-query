import { getLogger } from '../utils/logger.js';

/**
 * コンソール形式で結果を出力する
 * @param {Array} objects - 出力するオブジェクトの配列
 * @param {boolean} verbose - 詳細出力モード
 */
export function writeConsole(objects, verbose = false) {
  const logger = getLogger(verbose);
  
  if (!objects || objects.length === 0) {
    logger.info('検索結果が見つかりませんでした。');
    return;
  }

  logger.info(`=== 検索結果 (${objects.length}件) ===`);
  
  // フィールド名を取得
  const fields = Object.keys(objects[0]);
  
  // テーブル形式で出力するためのヘッダー
  const maxLengths = fields.map(field => {
    const fieldLength = field.length;
    const maxValueLength = Math.max(
      ...objects.map(obj => String(obj[field] || '').length)
    );
    return Math.max(fieldLength, maxValueLength, 8); // 最小幅を8文字に設定
  });

  // ヘッダー行を作成
  const headerLine = fields.map((field, index) => 
    field.padEnd(maxLengths[index])
  ).join(' | ');
  
  // 区切り線を作成
  const separatorLine = maxLengths.map(length => 
    '-'.repeat(length)
  ).join('-+-');

  // ヘッダーを出力
  console.log(headerLine);
  console.log(separatorLine);

  // データ行を出力
  objects.forEach((obj, rowIndex) => {
    const dataLine = fields.map((field, fieldIndex) => {
      const value = obj[field] || '';
      return String(value).padEnd(maxLengths[fieldIndex]);
    }).join(' | ');
    
    console.log(dataLine);
    
    // 10行ごとに空行を入れる（読みやすさのため）
    if ((rowIndex + 1) % 10 === 0 && rowIndex < objects.length - 1) {
      console.log('');
    }
  });

  // サマリーを出力
  console.log('');
  logger.info(`合計 ${objects.length} 件の結果を表示しました。`);
}

/**
 * 簡易なコンソール出力（JSON形式）
 * @param {Array} objects - 出力するオブジェクトの配列
 * @param {boolean} verbose - 詳細出力モード
 */
export function writeConsoleSimple(objects, verbose = false) {
  const logger = getLogger(verbose);
  
  if (!objects || objects.length === 0) {
    logger.info('検索結果が見つかりませんでした。');
    return;
  }

  logger.info(`=== 検索結果 (${objects.length}件) ===`);
  
  objects.forEach((obj, index) => {
    console.log(`\n[${index + 1}]`);
    for (const [key, value] of Object.entries(obj)) {
      console.log(`  ${key}: ${value}`);
    }
  });

  console.log('');
  logger.info(`合計 ${objects.length} 件の結果を表示しました。`);
}

export default writeConsole;