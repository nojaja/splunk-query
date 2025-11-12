# Splunk SDK Version

このフォルダには `splunk-sdk` を利用した TypeScript 実装があります。

セットアップ

1. 依存インストール

```powershell
cd splunk-sdk_version ; npm install
```

2. ビルド

```powershell
npm run build
```

3. 実行（ヘルプ表示）

```powershell
node ./dist/index.js --help
```

Notes: Splunk の接続情報は環境変数で指定できます（SPLUNK_URL, SPLUNK_TOKEN, SPLUNK_USER, SPLUNK_PASSWORD, SPLUNK_MGMT_PORT）。

`.env` を使う場合はプロジェクトルートに配置してください（起動時に自動で読み込まれます）。

## CLI 使用例

ビルド後の `dist/index.js` を使って CLI を実行する例です。PowerShell の例を示します。

ヘルプ表示:

```powershell
node .\dist\index.js -h
```

短縮フラグを使った実行例:

```powershell
# 短縮フラグ版: -u (url), -t (token), -f (format), -o (output)
node .\dist\index.js -u http://localhost:8000 -t admin:changeme -f json -o test/e2e/out.json --query "search index=_internal | head 1"
```

ロングフォームのオプションを使う場合:

```powershell
node .\dist\index.js --url http://localhost:8000 --token admin:changeme --format csv --output test/e2e/out.csv --query-file ./query.spl
```

主なオプション一覧:

- `-u, --url <url>` : Splunk 管理 API の URL
- `-t, --token <token>` : Splunk 管理トークン / HEC トークン
- `-q, --query <string>` : クエリ文字列
- `--query-file <path>` : クエリファイル
- `-f, --format <csv|json|console>` : 出力形式（デフォルト: json）
- `-o, --output <path>` : 出力ファイルパス（省略時は out.json）
- `--verbose` : 詳細ログを有効化
- `--insecure` : TLS 証明書検証をスキップ（開発時のみ）

## E2E テスト

E2E テストを実行する前に、Docker Compose で Splunk を起動し初期化してください（テストが依存する環境が必要です）。

```powershell
npm run e2e
```

---

上記で不明点があれば教えてください。README の追加改善（例: 環境変数の具体例、`.env.example`、実行例の出力例など）も提案できます。
