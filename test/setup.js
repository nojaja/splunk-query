// Jest test setup
import { beforeAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

beforeAll(async () => {
  // テスト用の一時ディレクトリを確実に作成
  const tmpDir = path.resolve('./test/tmp');
  try {
    await fs.mkdir(tmpDir, { recursive: true });
  } catch (error) {
    // ディレクトリがすでに存在する場合は無視
    if (error.code !== 'EEXIST') {
      console.warn('Failed to create test tmp directory:', error);
    }
  }
});