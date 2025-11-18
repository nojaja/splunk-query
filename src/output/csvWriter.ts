import fs from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

// Note: when filePath is undefined, write to stdout instead of a file.

/**
 * データをCSV形式でファイルに書き込みます
 * RFC 準拠のエスケープ（必要に応じてダブルクォートで囲み、内部の"を""に）を行います
 * @param {string} filePath - 出力ファイルパス
 * @param {Array<object>} objects - 出力するオブジェクト配列
 * @returns {Promise<void>}
 */
export async function writeCsv(filePath: string | undefined, objects: Array<Record<string, any>>) {
  /**
   * オブジェクト配列からCSV文字列を構築します
   * @param {Array<Record<string, any>>} objs - CSV化するオブジェクト配列
   * @returns {string} CSV文字列
   */
  const buildCsv = (objs: Array<Record<string, any>>) => {
    const keys = Object.keys(objs[0]);
    const records = objs.map((o) => keys.map((k) => {
      const v = o[k];
      if (v === null || v === undefined) return '';
      // For objects/arrays we emit empty string (keep previous behavior)
      if (typeof v === 'object') return '';
      return String(v);
    }));
    return stringify(records, { header: true, columns: keys });
  };

  if (!filePath) {
    // write to stdout
    if (!objects || objects.length === 0) {
      process.stdout.write('');
      return;
    }
    const csv = buildCsv(objects);
    process.stdout.write(csv);
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (!objects || objects.length === 0) return await fs.writeFile(filePath, '');

  const csv = buildCsv(objects);
  await fs.writeFile(filePath, csv);
}
