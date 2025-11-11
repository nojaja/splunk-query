# Splunk SDK Version

このフォルダには `splunk-sdk` を利用した TypeScript 実装があります。

セットアップ:

1. 依存インストール

```powershell
cd splunk-sdk_version ; npm install
```

2. ビルド

```powershell
npm run build
```

3. 実行

```powershell
node ./dist/index.js --help
```

Notes: Splunk の接続情報は環境変数で指定できます（SPLUNK_URL, SPLUNK_TOKEN, SPLUNK_USER, SPLUNK_PASSWORD, SPLUNK_MGMT_PORT）。
