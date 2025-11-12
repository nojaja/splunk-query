import fs from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

/**
 * データをCSV形式でファイルに書き込みます
 * RFC 準拠のエスケープ（必要に応じてダブルクォートで囲み、内部の"を""に）を行います
 * @param {string} filePath - 出力ファイルパス
 * @param {Array<object>} objects - 出力するオブジェクト配列
 * @returns {Promise<void>}
 */
export async function writeCsv(filePath: string, objects: Array<Record<string, any>>) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (!objects || objects.length === 0) return await fs.writeFile(filePath, '');

  const keys = Object.keys(objects[0]);

  // Build records as arrays in the same column order as keys
  const records = objects.map((o) => keys.map((k) => {
    const v = o[k];
    if (v === null || v === undefined) return '';
    // For objects/arrays we emit empty string (same behavior as before)
    if (typeof v === 'object') return '';
    return String(v);
  }));

  // Use csv-stringify sync to produce RFC-compliant CSV. Provide header row.
  const csv = stringify(records, { header: true, columns: keys });
  await fs.writeFile(filePath, csv);
}
