# spec_v5

含まれるファイル:
- `copilot_prompt.txt` - Copilot に渡すべき実装プロンプト（日本語）
- `spec.md` - 概要と受け入れ基準
- `design.md` - 実装設計（API 契約、モジュール構成、データ形状）
- `requirements.md` - 機能要件／非機能要件
- `implementation_notes.md` - 実装時の注意事項、E2E の Docker Compose と SplunkEE に関する手順

注意: この仕様では `dynamic import`（実行時の import()）の使用を禁止します。すべて静的な import/export による実装としてください。

## Lint ルールの補足

非機能要件の「complexity ルール max 10」は、`eslint-plugin-sonarjs` の `sonarjs/cognitive-complexity` ルールで代替しています（閾値: 10）。

設定:

```
// eslint.config.cjs
module.exports = {
	extends: ['eslint:recommended'],
	plugins: ['sonarjs'],
	rules: {
		complexity: 'off',
		'sonarjs/cognitive-complexity': ['error', 10]
	}
}
```
