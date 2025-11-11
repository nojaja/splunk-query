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
  for (const k of Object.keys(row)) {
    const v = row[k];
    obj[k] = (v === null || v === undefined || typeof v === 'object') ? '' : v;
  }
  return obj;
}
