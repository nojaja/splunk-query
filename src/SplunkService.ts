import splunkjs from 'splunk-sdk';
import { SearchError } from './errors';
import { getLogger } from './utils/logger';

type SplunkServiceConfig = {
  baseUrl?: string;
  token?: string;
  username?: string;
  password?: string;
  verbose?: boolean;
  insecure?: boolean;
};

/**
 * Splunk検索サービスクラス
 */
export class SplunkService {
  baseUrl: string | undefined;
  token: string | undefined;
  username: string | undefined;
  password: string | undefined;
  mgmtPort: string | number;
  verbose: boolean;
  insecure: boolean;
  logger: ReturnType<typeof getLogger>;

  /**
   * SplunkServiceのコンストラクタ
   * @param {object} config - 設定オブジェクト
   * @param {string} config.baseUrl - SplunkのベースURL
   * @param {string} config.token - 認証トークン
   * @param {string} config.username - ユーザー名
   * @param {string} config.password - パスワード
   * @param {boolean} config.verbose - 詳細ログ出力の有効/無効
   */
  constructor({ baseUrl, token, username, password, verbose }: SplunkServiceConfig = {}) {
    this.baseUrl = baseUrl || process.env.SPLUNK_URL; // e.g. http://localhost:8000
    this.token = token || process.env.SPLUNK_TOKEN; // optional token for HEC or bearer
    this.username = username || process.env.SPLUNK_USER;
    this.password = password || process.env.SPLUNK_PASSWORD;
    this.mgmtPort = process.env.SPLUNK_MGMT_PORT || 8089;
    this.verbose = Boolean(verbose);
    this.insecure = Boolean((arguments[0] && (arguments[0] as any).insecure) || process.env.SPLUNK_SKIP_TLS_VERIFY === '1');
    this.logger = getLogger(this.verbose);
    if (this.insecure) {
      // Explicit insecure mode: skip TLS validation for self-signed certs (development only)
      this.logger.warn('TLS 証明書の検証をスキップします（開発用: 本番での使用は推奨されません）');
      // apply process-wide setting once
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }

  /**
   * 検索クエリを正規化します
   * @param {string} query - 元の検索クエリ
   * @returns {string} - 正規化されたクエリ
   */
  private _normalizeQuery(query: string) {
    const qtrim = query.trim();
    return qtrim.replace(/^search\s+/i, '');
  }

  private _createService(overridePort?: number, overrideScheme?: string) {
    if (!this.baseUrl) throw new Error('baseUrl missing');
    const u = new URL(this.baseUrl);
    const proto = (u.protocol || 'https:').replace(':', '');
    const host = u.hostname;
    // prefer explicit port in baseUrl if provided (e.g. http://localhost:8000)
    const urlPort = u.port && u.port.length > 0 ? Number(u.port) : undefined;
    const port = typeof overridePort === 'number' ? overridePort : (urlPort || Number(this.mgmtPort));
    const scheme = overrideScheme || proto;
    const options: any = { scheme, host, port };
    if (this.token) options.token = this.token;
    else if (this.username && this.password) {
      options.username = this.username;
      options.password = this.password;
    }
    // splunkjs.Service expects options like { scheme, host, port, username, password }
  if (this.verbose) this.logger.debug(`creating splunk service: ${scheme}://${host}:${port}`);
    // @ts-ignore
    return new splunkjs.Service(options);
  }

  private _getResultsArray(body: any) {
    return body && (body.results || body.result || body.entry) ? (body.results || body.result || body.entry) : null;
  }
  
  /**
   * レスポンスボディからフィールドと行データを導出
   * @param {object} body - レスポンスボディオブジェクト
   * @returns {object} - fields、rows、resultsを含むオブジェクト
   */
  private _deriveFieldsAndRows(body: any) {
    const results = this._getResultsArray(body);
    const normFields = this._normalizeFields(body, results);
    if (results && Array.isArray(results)) {
      const rows = results.map((r: any) => this._rowFromResult(r, normFields));
      return { fields: normFields, rows, results };
    }
    return { fields: normFields, rows: [], results: null };
  }
  
  /**
   * フィールドを正規化
   * @param {object} body - レスポンスボディオブジェクト
   * @param {Array} results - 結果配列
   * @returns {Array} - 正規化されたフィールド配列
   */
  private _normalizeFields(body: any, results: any[]) {
    if (body && body.fields) return body.fields;
    if (results && results.length) return this._fieldsFromFirst(results[0]);
    return [];
  }

  /**
   * 最初の結果からフィールドを抽出
   * @param {object|Array} first - 最初の結果アイテム
   * @returns {Array} - フィールド名の配列
   */
  private _fieldsFromFirst(first: any) {
    if (Array.isArray(first)) return first.map((_, i) => String(i));
    if (first && typeof first === 'object') return Object.keys(first);
    return [];
  }

  /**
   * 結果アイテムから行データを生成
   * @param {object|Array} r - 結果アイテム
   * @param {Array} normFields - 正規化されたフィールド配列
   * @returns {Array} - 行データ配列
   */
  private _rowFromResult(r: any, normFields: string[]) {
    if (Array.isArray(r)) return r;
    if (r && typeof r === 'object') return normFields.map(f => r[f]);
    return [r];
  }

  /**
   * Splunkで検索を実行します
   * @param {string} query - 検索クエリ
   * @returns {Promise<object>} - 検索結果（fields, rows, results）
   */
  async search(query: string) {
    if (!query) throw new SearchError('query required');
    if (!this.baseUrl) throw new SearchError('baseUrl required');

    const qbody = this._normalizeQuery(query);
    let service = this._createService();

    const doLoginAndSearch = async (svc: any) => {
      await new Promise<void>((resolve, reject) => {
        if (this.username && this.password) {
          // @ts-ignore
          svc.login((loginErr: any, success: any) => {
            if (loginErr) return reject(loginErr);
            return resolve();
          });
        } else {
          return resolve();
        }
      });

      return await new Promise<any>((resolve, reject) => {
        // @ts-ignore - splunk-sdk typings are not strict here
        svc.oneshotSearch(`search ${qbody}`, { output_mode: 'json', count: 100 }, (err: any, results: any) => {
          if (err) {
            if (this.verbose) this.logger.debug('oneshotSearch error', err);
            return reject(err);
          }
          try {
            let body: any = results;
            if (typeof results === 'string') {
              body = JSON.parse(results);
            } else if (results && results.body) {
              try { body = JSON.parse(results.body); } catch { body = results.body; }
            }
            const derived = this._deriveFieldsAndRows(body || {});
            resolve(derived);
          } catch (parseErr) {
            reject(parseErr);
          }
        });
      });
    };

    try {
      return await doLoginAndSearch(service);
    } catch (err: any) {
      if (this.verbose) this.logger.debug('search exception', err);
      const text = (err && (err.message || err.cause || String(err))) ? String(err.message || err.cause || err) : '';
      const code = err && (err.code || (err.cause && err.cause.code));
      // retry if missing session key or connection reset/socket hang up (likely HTTP/HTTPS mismatch or wrong port)
      if (text && (text.includes('No session key') || text.includes('No session key available')) || code === 'ECONNRESET' || text.includes('socket hang up') || (err && err.status === 600)) {
        // retry with mgmtPort if baseUrl pointed to web UI port
        try {
          if (this.verbose) this.logger.debug('Retrying login/search using management port', this.mgmtPort);
          service = this._createService();
          // if baseUrl included a non-mgmt port, explicitly override to mgmtPort and force https
          const u = new URL(this.baseUrl as string);
          const urlPort = u.port && u.port.length > 0 ? Number(u.port) : undefined;
          if (urlPort && Number(urlPort) !== Number(this.mgmtPort)) {
            service = this._createService(Number(this.mgmtPort), 'https');
          } else {
            // also try forcing https on management port
            service = this._createService(Number(this.mgmtPort), 'https');
          }
          return await doLoginAndSearch(service);
        } catch (err2: any) {
          if (this.verbose) this.logger.debug('retry exception', err2);
          throw new SearchError('search failed', err2);
        }
      }
      throw err instanceof SearchError ? err : new SearchError('network error', err);
    }
  }
}
