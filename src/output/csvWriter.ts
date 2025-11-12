import fs from 'fs/promises';
import path from 'path';

// Note: when filePath is undefined, write to stdout instead of a file.

/**
 * データをCSV形式でファイルに書き込みます
 * @param {string} filePath - 出力ファイルパス
 * @param {Array<object>} objects - 出力するオブジェクト配列
 * @returns {Promise<void>}
 */
export async function writeCsv(filePath: string | undefined, objects: Array<Record<string, any>>) {
  if (!filePath) {
    // write to stdout
    if (!objects || objects.length === 0) {
      process.stdout.write('');
      return;
    }
    const keys = Object.keys(objects[0]);
    const lines = [keys.join(','), ...objects.map(o => keys.map(k => {
      const v = o[k];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object' || Array.isArray(v)) return '';
      return JSON.stringify(v);
    }).join(','))];
    process.stdout.write(lines.join('\n'));
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (!objects || objects.length === 0) return await fs.writeFile(filePath, '');
  const keys = Object.keys(objects[0]);
  const lines = [keys.join(','), ...objects.map(o => keys.map(k => {
    const v = o[k];
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' || Array.isArray(v)) return '';
    return JSON.stringify(v);
  }).join(','))];
  await fs.writeFile(filePath, lines.join('\n'));
}
