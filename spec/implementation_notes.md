# 実装ノート (v5)

重要点
- dynamic import（実行時 import()）は禁止。すべて静的 import/export を使うこと。
- E2E は必ず Docker Compose で起動した SplunkEE に接続して実行すること。

依存関係（代表）
- commander
- dotenv
- splunk-sdk
- csv (csv-stringify)
- log4js
- jest
- pkg (オプション)

SplunkService 実装ヒント
- コンストラクタで { url, token, verbose } を受け取り、インスタンス変数に保持する。
- search(query, params) は Promise を返す。
- 内部で splunk-sdk の job 作成 -> job.track -> job.results() を呼び出し、結果を normalizeResults に渡す。
- エラーは SearchError を throw する。SearchError は code（'AUTH','NETWORK','QUERY','UNKNOWN' 等）を持つ。

出力ライター
- writeCsv(results, filePath) は親ディレクトリを mkdir してから書き込む。
- CSV 生成は `csv` パッケージを使うことを推奨。ただし依存を避ける場合は簡単なエスケープ実装で代替可。

テスト設計

Unit tests
- SplunkService はモックされた splunk-sdk を使って動作を確認する。
- csvWriter/jsonWriter はファイル I/O を一時ディレクトリで検証する。

E2E
- `test/e2e/docker-compose.yml` を用意し、以下を含める:
  - service `splunk` : Splunk Enterprise イメージ（公式 `splunk/splunk:8.2.0` 等）
  - service `app` : （E2E 用）ツールを実行するコンテナ（Node か事前ビルドしたバイナリ）
- テストフロー:
  1. Docker Compose で SplunkEE を起動する。
  2. Splunk の管理 API で必要な初期設定（ユーザー作成、HEC トークン作成、index 作成）を行う。これは Splunk 管理 API を用いて programmatic に行うか、初期化スクリプトを使う。
  3. App を実行してクエリを実行、出力ファイルの中身を検証する。

ローカル実行手順（PowerShell 用例）

1) 依存関係インストール

```powershell
cd d:/devs/workspace202111/splunk-query05
npm install
```

2) unit tests 実行

```powershell
npm run test
```

3) lint

```powershell
npm run lint
```

4) E2E 実行手順（概略）

```powershell
cd test/e2e
docker-compose up -d
# 管理 API で初期設定を行う (script を用意)
# 例: powershell から Invoke-RestMethod を使って HEC token を作成
# App コンテナまたはローカル Node から --url と --token を渡して実行
docker-compose down
```

具体的な PowerShell サンプル手順（例）:

```powershell
cd d:/devs/workspace202111/splunk-query05/test/e2e
docker-compose up -d
# 起動待ち（120秒）
Start-Sleep -Seconds 120
# 初期化（index 作成・HEC token 作成など）
pwsh ./init-splunk.ps1 -MgmtHost 'https://localhost:8089' -AdminPassword 'changeme'
# ローカルの CLI を実行
cd ..\..
node src/cli.js --query "search index=_internal | head 1" --url http://localhost:8000 --token admin:changeme --out test/e2e/out.json
# 検証: test/e2e/out.json の存在と中身を確認
docker-compose down
```

注意事項
- E2E の Splunk イメージはサイズが大きく、起動に時間がかかる。CI 上での E2E 実行は推奨しない（CI は unit tests のみ実行する）。
- Splunk の初期プロビジョニングではファイルマウントの権限問題が起きやすい。必要に応じて API ベースの設定を行うこと。
