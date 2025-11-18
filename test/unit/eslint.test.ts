import fs from 'fs';
import path from 'path';
import { ESLint } from 'eslint';
import { describe, it, expect } from '@jest/globals';

// ESLintによるsrc配下の静的解析テスト
describe('ESLint validation', () => {
  // Given: プロジェクトの ESLint 設定が存在する場合のみ実行する describe
  // When: src 以下を lint にかける
  // Then: エラーがなければテストが通る（存在しない場合はスキップ）
  it('should have no linting errors (skips if no config)', async () => {
    // Given（前提）: ESLint 設定が存在するかをチェック
    // When（操作）: ESLint で src/**/*.js を lint する
    // Then（期待）: エラー件数が 0 であること
    // プロジェクトルートにESLint設定がなければテストをスキップする
    const root = path.resolve('.');
    const hasConfig = fs.existsSync(path.join(root, '.eslintrc.js')) || fs.existsSync(path.join(root, '.eslintrc')) || fs.existsSync(path.join(root, '.eslintrc.json')) || (fs.existsSync(path.join(root, 'package.json')) && !!(require(path.join(root, 'package.json')).eslintConfig));
    if (!hasConfig) {
      console.log('ESLint設定が見つかりません。ESLintテストをスキップします。');
      return;
    }

    const eslint = new ESLint({});
    const results = await eslint.lintFiles(['src/**/*.js']);
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);
    const errorCount = results.reduce((sum, file) => sum + file.errorCount, 0);
    if (errorCount > 0) {
      console.log(resultText);
    }
    expect(errorCount).toBe(0);
  });
});
