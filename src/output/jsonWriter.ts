import fs from 'fs/promises';
import path from 'path';

/**
 * データをJSON形式でファイルに書き込みます
 * @param {string} filePath - 出力ファイルパス
 * @param {Array<object>} objects - 出力するオブジェクト配列
 * @returns {Promise<void>}
 */
export async function writeJson(filePath, objects) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(objects, null, 2));
}
