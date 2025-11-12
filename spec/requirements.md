# 要件 (v5)

機能要件
- CLI は次のオプションをサポートすること。
  - `-u, --url <url>` : Splunk 管理 API の URL
  - `-t, --token <token>` : Splunk 管理トークン / HEC トークン
  - `--query <string>` : クエリ文字列（優先度最高）
  - `--query-file <path>` : クエリを格納したファイル
  - `--format <csv|json|console>` : 出力形式（デフォルト: csv）
  - `-f, --file <path>` : 出力先ファイルパス（省略時は stdout）
  - `--verbose` : 詳細ログを有効化

- 入力優先度: `--query` > `--query-file` > stdin
- Splunk への接続は `SplunkService.search(query, params)` を通じて行い、戻り値は `{ fields: string[], rows: any[][], rawresults: any[] }` とする。
- 出力先ディレクトリが存在しない場合は `fs.promises.mkdir(parent, { recursive: true })` で自動作成する。

非機能要件
- Node.js v18 以上、TypeScriptを使用すること（静的 import のみ）。dynamic import 禁止。
- ESLint を導入し、`complexity` ルールの max を 10 に設定すること。
- 単体テストは Jest（TypeScript 対応）で実装すること。
- E2E テストは Docker Compose を用い、SplunkEE を起動して実行すること（ローカル実行を想定）。

セキュリティ
- 認証情報等の秘匿情報は `.env` または環境変数で注入すること。リポジトリに平文で含めない。

運用
- `npm run build` で tsconfig.json によるjsを生成すること（出力: `dist/index.js`）。
- `npm run pkg:build` で `pkg` を使いバイナリを `release/` に出力すること（オプション）。
