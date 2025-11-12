import fs from 'fs/promises';
import path from 'path';

// When filePath is undefined, write JSON to stdout.

/**
 * データをJSON形式でファイルに書き込みます
 * @param {string} filePath - 出力ファイルパス
 * @param {Array<object>} objects - 出力するオブジェクト配列
 * @returns {Promise<void>}
 */
export async function writeJson(filePath: string | undefined, objects: Array<Record<string, any>>) {
  const content = JSON.stringify(objects, null, 2);
  if (!filePath) {
    process.stdout.write(content);
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
