# spec (v5)

目的
----
Splunk に対して検索を実行し、その結果を CSV / JSON / console に出力する CLI ツールを実装するための仕様書。

ゴール
----
- Node.js (v18+) を対象とした ESM モジュールで実装すること。
- CLI は `commander` を用いて実装すること。
- Splunk への接続は `splunk-sdk`（または REST 代替）を用い、Search の結果を `{ fields, rows }` 形式で扱うこと。
- 出力は CSV（`csv` パッケージまたは標準実装）、JSON、console のいずれかを選べること。
- static import/export のみを使用し、dynamic import（import()）は禁止する。

受け入れ基準
----
1. CLI で `--query`、`--query-file`、stdin（pipe）のいずれかからクエリを受け取ること。優先度は `--query` > `--query-file` > stdin。
2. Splunk へクエリを投げ、完了を待ち、`fields` と `rows` の形で受け取り出力できること。
3. 出力先ディレクトリが存在しない場合は自動で作成されること。
4. unit tests が Jest で書かれており、主要フローはモック化して検証できること。
5. E2E テストは `docker-compose` で起動した Splunk Enterprise（以下 SplunkEE）に対して実行すること。
6. 実装およびテスト手順はこの `spec_v5` 単独で完結していること。
