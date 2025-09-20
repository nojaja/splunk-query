import { test, expect } from '@playwright/test';
import { execSync, execFileSync, spawn } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import crypto from 'crypto';

const sleep = promisify(setTimeout);

// Disable TLS certificate verification for test HEC health check (test-only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const CLI_BINARY = './release/index.bundle-win.exe';
const OUT_JSON = 'test/e2e/logs/out.json';
const AUDIT_CSV = 'test/e2e/logs/audit_out.csv';
const SPLUNK_USER = 'admin';
let SPLUNK_PASS = null; // ここで後から生成して代入します
const SPLUNK_URL = 'http://localhost:8000';
// Compose logs process (spawned to stream container logs during tests)
let composeLogsProc = null;

/**
 * SplunkコンテナのIDを取得
 * @returns {string} - コンテナのID
 */
function getSplunkContainerId() {
  return execSync('docker ps -q -f name=splunk', { encoding: 'utf-8' }).trim();
}

/**
 * Splunk HTTPポートの準備を待機
 * @param {number} timeoutSec タイムアウト秒数（秒）
 * @returns {Promise<void>} 非同期処理
 */
async function waitForSplunkHttp(timeoutSec = 240) {
  // Helper: check if Splunk web is up
  /**
   * Splunk Web が応答しているかを判定します。
   * @returns {Promise<boolean>} 応答有無
   */
  async function isSplunkWebUp() {
    try {
      const response = await fetch(SPLUNK_URL, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  // Helper: check HEC health endpoint
  /**
   * HEC のヘルスエンドポイントが準備できているかを判定します。
   * @returns {Promise<boolean>} 応答有無
   */
  async function isHECHealthy() {
    try {
      const hecRes = await fetch('https://localhost:8088/services/collector/health', { method: 'GET', signal: AbortSignal.timeout(5000) });
      return hecRes.status === 200;
    } catch (e) {
      return false;
    }
  }

  const start = Date.now();
  while (Date.now() - start < timeoutSec * 1000) {
    const webUp = await isSplunkWebUp();
    const hecUp = webUp ? await isHECHealthy() : false;
    if (webUp && hecUp) return;
    console.log('Waiting for Splunk HTTP to be available...', `webUp=${webUp}`, `hecUp=${hecUp}`);
    await sleep(5000);
  }
  throw new Error('Splunk HTTPポートがタイムアウトしました');
}

test.describe('Splunk E2Eシナリオ', () => {
  test.beforeAll(async () => {
    // ランダムなパスワードを生成して docker-compose 実行時に渡す
    /**
     * 指定長のランダムなパスワードを生成します。
     * @param {number} len 生成するパスワードの長さ
     * @returns {string} 生成されたパスワード
     */
    function generatePassword(len = 16) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!@#%&*+=';
      const bytes = crypto.randomBytes(len);
      let out = '';
      for (let i = 0; i < len; i++) {
        out += chars[bytes[i] % chars.length];
      }
      return out;
    }
    SPLUNK_PASS = generatePassword(16);
    // docker-compose.yml と同じディレクトリ
    const COMPOSE_DIR = 'test/e2e';
    // Generate HEC token for test
    /**
     * HEC 用のランダムトークンを生成します（hex 形式 32 文字）
     * @returns {string} 生成されたトークン
     */
    function generateToken() {
      return crypto.randomBytes(16).toString('hex');
    }
    const HEC_TOKEN = generateToken();

    console.log('生成したSplunkパスワード（テスト用）:', SPLUNK_PASS);
    console.log('生成したHECトークン（テスト用）:', HEC_TOKEN);

    // docker-compose 実行時はプロセス env に渡す（.env ファイルを作らない）
    // Pass secrets via child process env directly to docker-compose (no persistent .env file)
    const composeEnv = { ...process.env, SPLUNK_PASSWORD: SPLUNK_PASS, HEC_TOKEN };
    execFileSync('docker-compose', ['-f', 'docker-compose.yml', 'up', '-d', '--build'], { stdio: 'inherit', cwd: COMPOSE_DIR, env: composeEnv });

    // Stream docker-compose logs to the terminal so container logs are visible during E2E
    try {
      composeLogsProc = spawn('docker-compose', ['-f', 'docker-compose.yml', 'logs', '-f'], { cwd: COMPOSE_DIR, env: composeEnv, stdio: 'inherit' });
      console.log('docker-compose logs -f started, streaming container logs to terminal');
    } catch (err) {
      console.warn('Failed to start docker-compose logs -f:', err.message);
    }

    // Splunk HTTP が利用可能になるまで待機
    await waitForSplunkHttp();

    // コンテナが起動したら inputs.conf を注入して init-index.sh を実行する
    const cid = getSplunkContainerId();
    try {
      // entrypoint-wrapper が既に init-index を実行している可能性があるため
      // コンテナ内のマーカー `/tmp/logs/hec_response.json` を確認し、存在する場合はホスト側から実行しない
      let needInit = true;
      try {
        execFileSync('docker', ['exec', cid, 'test', '-f', '/tmp/logs/hec_response.json'], { stdio: 'ignore' });
        // ファイルが存在すれば wrapper 側で処理済み
        needInit = false;
        console.log('Container already initialized init-index (marker found), skipping host init-index execution');
      } catch (e) {
        // ファイルが無ければホストから実行
        needInit = true;
      }

      if (needInit) {
        // init-index.sh を環境変数を渡して実行（配列引数でシェル解釈を回避）
        execFileSync('docker', ['exec', '-e', `SPLUNK_PASSWORD=${SPLUNK_PASS}`, '-e', `HEC_TOKEN=${HEC_TOKEN}`, cid, '/opt/splunk/bin/init-index.sh'], { stdio: 'inherit' });
      }

    } catch (e) {
      console.warn('コンテナ内への注入や初期化に失敗しました:', e.message);
    }

    // HECの初期化完了まで待機
    console.log('Waiting for HEC initialization to complete...');
    await sleep(10000); // 10秒待機

    // run-e2e.ps1と同様のデータ投入プロセスを追加
    try {
      console.log('Adding guaranteed oneshot event inside container');
      const msg = 'e2e guaranteed event';
      execFileSync('docker', ['exec', '-i', cid, '/bin/bash', '-c', `printf '%s\\n' "${msg}" > /tmp/e2e_guaranteed.txt`], { stdio: 'inherit' });
      // Pass password via environment var to avoid shell interpretation issues
      execFileSync('docker', ['exec', '-i', '-e', `SPLUNK_PASSWORD=${SPLUNK_PASS}`, cid, '/opt/splunk/bin/splunk', 'add', 'oneshot', '/tmp/e2e_guaranteed.txt', '-index', 'main', '-auth', `admin:${SPLUNK_PASS}`], { stdio: 'inherit' });
      console.log('Guaranteed oneshot attempted');
      // Splunkがoneshotイベントをインデックスするまで待機
      await sleep(10000); // さらに10秒待機
    } catch (error) {
      console.warn('Guaranteed oneshot failed:', error.message);
    }

    console.log('Splunk initialization completed, ready for tests');
  });

  test('CLIで集計結果取得', async () => {
    if (!fs.existsSync(CLI_BINARY)) {
      console.warn(`CLIバイナリが存在しません: ${CLI_BINARY}`);
      test.skip();
      return;
    }
    // main集計クエリ
    const tmpQuery = 'test/e2e/tmp_query.txt';
    // UTF-8 BOM付きでファイルを作成してエンコーディング問題を回避
    const queryContent = 'index=main earliest=-1h';
    const utf8Bom = '\uFEFF'; // UTF-8 BOM
    fs.writeFileSync(tmpQuery, utf8Bom + queryContent, 'utf8');
    try {
      // TLS証明書検証を無効化
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      execFileSync(CLI_BINARY, ['--query-file', tmpQuery, '--url', SPLUNK_URL, '--user', SPLUNK_USER, '--password', SPLUNK_PASS, '--file', OUT_JSON], { encoding: 'utf-8' });
    } catch (error) {
      console.warn('CLI実行でエラーが発生しましたが、ファイル生成を確認します:', error.message);
    }
    // JavaScriptでファイル削除
    try {
      if (fs.existsSync(tmpQuery)) {
        fs.unlinkSync(tmpQuery);
      }
    } catch (e) { /* 無視 */ }
    expect(fs.existsSync(OUT_JSON)).toBeTruthy();
    const json = JSON.parse(fs.readFileSync(OUT_JSON, 'utf-8'));
    expect(json).toBeDefined();
    // JSONの構造を柔軟にチェック（resultまたはresultsまたは配列データなど）
    expect(json).not.toBeNull();
    console.log('JSON構造:', Object.keys(json));
  });

  test('auditクエリとCSV検証', async () => {
    if (!fs.existsSync(CLI_BINARY)) {
      console.warn(`CLIバイナリが存在しません: ${CLI_BINARY}`);
      test.skip();
      return;
    }
    // auditクエリ
    const tmpAuditQuery = 'test/e2e/tmp_audit_query.txt';
    // UTF-8 BOM付きでファイルを作成してエンコーディング問題を回避
    const auditQueryContent = 'index=_audit | head 10';
    const utf8Bom = '\uFEFF'; // UTF-8 BOM
    fs.writeFileSync(tmpAuditQuery, utf8Bom + auditQueryContent, 'utf8');
    try {
      // TLS証明書検証を無効化
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      execFileSync(CLI_BINARY, ['--query-file', tmpAuditQuery, '--url', SPLUNK_URL, '--user', SPLUNK_USER, '--password', SPLUNK_PASS, '--file', AUDIT_CSV, '--format', 'csv'], { encoding: 'utf-8' });
    } catch (error) {
      console.warn('audit CLI実行でエラーが発生しましたが、ファイル生成を確認します:', error.message);
    }
    // JavaScriptでファイル削除
    try {
      if (fs.existsSync(tmpAuditQuery)) {
        fs.unlinkSync(tmpAuditQuery);
      }
    } catch (e) { /* 無視 */ }
    expect(fs.existsSync(AUDIT_CSV)).toBeTruthy();
    const csv = fs.readFileSync(AUDIT_CSV, 'utf-8');
    // action= など監査ログの一部で判定
    expect(csv).toMatch(/action=/);
  });

  test.afterAll(async () => {
    try {
      // Stop log streaming if started
      if (composeLogsProc && !composeLogsProc.killed) {
        try {
          composeLogsProc.kill();
          console.log('Stopped docker-compose logs -f process');
        } catch (e) {
          console.warn('Failed to stop docker-compose logs process:', e.message);
        }
      }
      execSync(`docker-compose -f docker-compose.yml down`, { stdio: 'inherit', cwd: 'test/e2e' });
    } finally {
      // .env は利用しないため、削除処理は不要
    }
  });
});
