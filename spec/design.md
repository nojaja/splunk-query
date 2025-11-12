# 設計 (v5)

概要
----
CLI -> App -> SplunkService -> normalizeResults -> OutputWriter という単純なパイプライン構成にする。

ディレクトリ構成

```
src/
  cli.ts            # commander を使った CLI パーサ
  index.ts          # エントリポイント: dotenv 読込 -> cli -> app 実行
  app.ts            # ワークフロー実装 (入力取得->検索->整形->出力)
  SplunkService.ts  # Splunk 接続と検索を担う (静的 import のみ)
  utils/
    normalizeResults.ts
  output/
    csvWriter.ts
    jsonWriter.ts
test/
  unit/
  e2e/
```

モジュール API

- SplunkService

```js
export class SplunkService {
  constructor({ url, token, verbose })
  async search(query, options = {}) // returns { fields: string[], rows: any[][] }
}
```

- App

```js
export class App {
  constructor({ splunkService, outputWriter, logger })
  async run({ query, outputPath, format }) // returns exitCode
}
```

- csvWriter

```js
export function writeCsv({ fields, rows }, filePath)
```

- jsonWriter

```js
export function writeJson({ fields, rows }, filePath)
```

データ形状

- 検索結果: { fields: string[], rows: any[][], rawresults: any[] }
  - fields: フィールド名の配列
  - rows: 各行が fields と同じ長さの配列
  - rawresults: fields/rowsの元データ

エラー設計

- SearchError クラスを定義し、{ code, message, meta } を持たせる。
- CLI は SearchError の code に応じて exit code を返す。

ログ

- `log4js` または `console` を使用し、`--verbose` で詳細ログを有効化する。ログは日本語で出力する。

静的 import の強制

この仕様では動的 import（import()）を禁止します。テストのためのモックは Jest のモジュールモック機能を使い、静的 import を維持してください。

E2E の概要

- `test/e2e/docker-compose.yml` を用意し、SplunkEE サービスを起動する。
- E2E テストは起動した SplunkEE に対して実際に認証情報を渡し、クエリを実行して出力を検証する。
