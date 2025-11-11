export type RawResult = any;
export type NormalizedObject = { [k: string]: string } | { _raw: string };
/**
 * Splunk検索結果を正規化します
 * @param {object} input - 検索結果オブジェクト
 * @param {Array} input.fields - フィールド配列
 * @param {Array} input.rows - 行データ配列
 * @param {Array} input.results - 結果配列
 * @returns {Array} - 正規化された結果配列
 */
export function normalizeResults({ fields, rows, results }: { fields?: string[]; rows?: any[]; results?: any[] }): NormalizedObject[] {
  // results配列が存在し、rows配列がnullまたは空の場合は、resultsを使用
  if (results && Array.isArray(results) && results.length > 0) {
    return _normalizeResultsArray(results);
  }
  
  if (!rows || !Array.isArray(rows)) return [];
  
  // If fields are absent, return rows as {_raw: <value>} or raw arrays
  // 処理概要: フィールド情報が無い場合の行変換
  // 実装理由: API から fields が返らないケースでも内容を失わずに扱えるようにするため
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return rows.map(_convertRowWithoutFields);
  }
  
  // 値配列の場合も必ずフィールド名でオブジェクト化
  return rows.map(row => _convertRowWithFields(row, fields));
}

/**
 * results配列を正規化します
 * @param {Array} results - 結果配列
 * @returns {Array} - 正規化された結果配列
 */
function _normalizeResultsArray(results: any[]): NormalizedObject[] {
  // 処理概要: results 配列の各要素を個別に正規化
  // 実装理由: results がオブジェクトやプリミティブ混在で来ることがあり、統一的な出力に揃えるため
  return results.map(row => {
    if (row && typeof row === 'object') return _createObjectFromRow(row);
    return { _raw: String(row) };
  });
}

/**
 * 行オブジェクトから正規化されたオブジェクトを作成します
 * @param {object} row - 行オブジェクト
 * @returns {object} - 正規化されたオブジェクト
 */
function _createObjectFromRow(row: any): NormalizedObject {
  const obj: any = {};
  // フィールドごとに値を正規化してオブジェクトに詰める
  // 実装理由: array/object/null 等の多様な値を文字列化して一貫したフォーマットにするため
  for (const k of Object.keys(row)) {
    const v = row[k];
    obj[k] = _normalizeValue(v);
  }
  return obj;
}

/**
 * 値を正規化します
 * @param {any} v - 正規化する値
 * @returns {string} - 正規化された文字列
 */
function _normalizeValue(v: any): string {
  // 処理概要: 値を適切な文字列に変換
  // 実装理由: 出力先で想定される型を統一して扱いやすくするため
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(',');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * フィールドなしで行を変換します
 * @param {any} r - 行データ
 * @returns {object} - 変換されたオブジェクト
 */
function _convertRowWithoutFields(r: any): NormalizedObject {
  // 処理概要: fields が無い行データを受け取り、可能なら構造を保って返す
  // 実装理由: フィールド情報が無い場合でもユーザーに意味のある形で返却するため
  if (Array.isArray(r)) return { _raw: r.join(' ') };
  if (r && typeof r === 'object') return r;
  return { _raw: String(r) };
}

/**
 * フィールドありで行を変換します
 * @param {any} row - 行データ
 * @param {Array} fields - フィールド配列
 * @returns {object} - 変換されたオブジェクト
 */
function _convertRowWithFields(row: any, fields: string[]): NormalizedObject {
  // 処理概要: fields がある場合に row をフィールド順でマッピングして返す
  // 実装理由: 呼び出し側でフィールド順の配列（rows）として扱いやすくするため
  if (Array.isArray(row)) return _convertArrayRow(row, fields);
  if (row && typeof row === 'object') return _convertObjectRow(row);
  return { _raw: String(row) };
}

/**
 * 配列行をオブジェクトに変換します
 * @param {Array} row - 行配列
 * @param {Array} fields - フィールド配列
 * @returns {object} - 変換されたオブジェクト
 */
function _convertArrayRow(row: any[], fields: string[]): NormalizedObject {
  const obj: any = {};
  // 処理概要: 配列形式の行を fields に従ってオブジェクト化する
  // 実装理由: Splunk の配列応答をキー付きオブジェクトに変換して扱いやすくするため
  for (let i = 0; i < fields.length; i++) {
    const v = row[i];
    obj[fields[i]] = (v === null || v === undefined || typeof v === 'object') ? '' : v;
  }
  return obj;
}

/**
 * オブジェクト行を正規化します
 * @param {object} row - 行オブジェクト
 * @returns {object} - 正規化されたオブジェクト
 */
function _convertObjectRow(row: any): NormalizedObject {
  const obj: any = {};
  // 処理概要: オブジェクト行の各値を検査してプリミティブ値のみを返却する
  // 実装理由: ネストオブジェクトや null を空文字に置換し、出力形式を安定させるため
  for (const k of Object.keys(row)) {
    const v = row[k];
    obj[k] = (v === null || v === undefined || typeof v === 'object') ? '' : v;
  }
  return obj;
}
