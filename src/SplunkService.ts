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
      // 実装理由: 開発環境で自己署名証明書を利用する際に、HTTPS接続で検証エラーになるのを回避する
      // 型定義の制約により直接代入で警告が出るため any キャストで回避する（安全性に注意）
      (process.env as any).NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }

  /**
   * 検索クエリを正規化します
   * 処理概要: 先頭の余白を削除し、先頭に 'search ' があれば取り除く
   * 実装理由: Splunk APIに渡すクエリは 'search ' が付いている場合があるため、API互換のために標準化する
   * @param {string} query - 元の検索クエリ
   * @returns {string} - 正規化されたクエリ
   */
  private _normalizeQuery(query: string) {
    const qtrim = query.trim();
    return qtrim;
  }

  /**
   * 処理名: Splunk Service インスタンス生成
   * 処理概要: 接続情報を組み立てて splunk-sdk の Service インスタンスを返す
   * 実装理由: Splunk API へ接続するために一元的な生成処理が必要なため
   * @param {number} [overridePort] - ポートを上書きする場合に指定
   * @param {string} [overrideScheme] - スキームを上書きする場合に指定
  * @returns {any} splunkjs.Service のインスタンス
   */
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
    // 処理概要: splunk-sdk の Service インスタンスを生成する
    // 実装理由: Splunk API に接続するために必要な接続オプションを組み立ててサービスクラスを生成する
    if (this.verbose) this.logger.debug(`creating splunk service: ${scheme}://${host}:${port}`);
    // splunkjs.Service の型が厳密でないため any として扱う
    // 型チェック抑制：実行時オブジェクトを生成するための警告を抑える
    // @ts-ignore
    return new (splunkjs as any).Service(options);
  }

  /**
   * 処理名: レスポンスから結果配列を取得
   * 処理概要: レスポンスの形式に応じて results/result/entry のいずれかを返す
   * 実装理由: Splunk のレスポンスは多様なキー名で結果を返すため、互換的に取り出す
   * @param {any} body - レスポンスボディ
   * @returns {any[]|null}
   */
  private _getResultsArray(body: any) {
    return body && (body.results || body.result || body.entry) ? (body.results || body.result || body.entry) : null;
  }

  /**
   * レスポンスボディからフィールドと行データを導出
   * 処理概要: レスポンスボディからフィールド配列と行データを正規化して返す
   * 実装理由: 呼び出し側が統一フォーマット（fields, rows）で扱えるように整形する
   * @param {object} body - レスポンスボディオブジェクト
   * @returns {object} - fields、rows、resultsを含むオブジェクト
   */
  private _deriveFieldsAndRows(body: any) {
    const results = this._getResultsArray(body);
    const normFields = this._normalizeFields(body, results);
    // 結果が配列であれば各要素を行データに変換する
    if (results && Array.isArray(results)) {
      const rows = results.map((r: any) => this._rowFromResult(r, normFields));
      return { fields: normFields, rows, results };
    }
    // 結果が配列でない場合は空の行配列を返す
    return { fields: normFields, rows: [], results: null };
  }

  /**
   * フィールドを正規化
   * 処理概要: body.fields があればそれを返し、無ければ最初の結果からフィールドを抽出する
   * 実装理由: レスポンス形式のばらつきに対応してフィールド情報を確実に取得するため
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
   * 処理概要: 配列ならインデックス番号、オブジェクトならキー一覧をフィールドとして返す
   * 実装理由: フィールド情報が明示されない場合に結果の構造から補完するため
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
   * 処理概要: 配列ならそのまま返し、オブジェクトならフィールド順で値を取り出す
   * 実装理由: 呼び出し側で一貫した行データ配列を扱えるように正規化するため
   * @param {object|Array} r - 結果アイテム
   * @param {Array} normFields - 正規化されたフィールド配列
   * @returns {Array} - 行データ配列
   */
  private _rowFromResult(r: any, normFields: string[]) {
    if (Array.isArray(r)) return r;
    if (r && typeof r === 'object') return normFields.map(f => (r as any)[f]);
    return [r];
  }

  /**
   * 処理名: login と oneshotSearch 実行（ヘルパー）
   * 処理概要: 指定された Service インスタンスで必要に応じてログインを行い、oneshotSearch を実行して結果を返す
   * 実装理由: search メソッド内のネストを減らし、処理を分離して可読性とテスト容易性を高めるため
   * @param {any} svc - splunkjs の Service インスタンス
   * @param {string} qbody - 正規化済みクエリ文字列
   * @returns {Promise<any>} - 正規化された検索結果
   */
  private async _doLoginAndSearch(svc: any, qbody: string) {
    // 必要であればログインを行う（ラップしてヘルパー化）
    await this._maybeLogin(svc);

    // oneshotSearch を呼び出して JSON レスポンスを解釈する
    // oneshotSearch のコールバックラップは別メソッドへ委譲する
    return await this._oneshotSearchPromise(svc, qbody);
  }

  /**
   * 処理名: oneshotSearch コールバックの Promise ラップ
   * 処理概要: svc.oneshotSearch を Promise でラップし、結果を解析して返す
   * 実装理由: コールバックの処理を切り出して責務を分離し、可読性を高める
   * @param {any} svc - splunkjs の Service インスタンス
   * @param {string} qbody - 正規化済みクエリ
  * @returns {Promise<any>} - 解析された検索結果を返す Promise
   */
  private _oneshotSearchPromise(svc: any, qbody: string) {
    return new Promise<any>((resolve, reject) => {
      // splunk-sdk の型定義が緩いため型アサーションで呼び出す
      // 型チェック抑制
      // @ts-ignore
      svc.oneshotSearch(`${qbody}`, { output_mode: 'json', count: 100 }, (err: any, results: any) => {
        if (err) {
          this.verbose && this.logger.debug('oneshotSearch error', err);
          // attach a code to native/network errors so upstream can map exit codes
          if (!(err instanceof SearchError)) {
            try {
              (err as any).code = (err && (err.code || (err as any).errno)) || 'NETWORK_ERROR';
            } catch (_) {
              (err as any).code = 'NETWORK_ERROR';
            }
          }
          return reject(err);
        }
        try {
          // results を解析して正規化されたボディを取得
          const body = this._parseResultsBody(results);
          const derived = this._deriveFieldsAndRows(body || {});
          resolve(derived);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  }

  /**
   * 処理名: 必要に応じたログイン実行
   * 処理概要: username/password が設定されていれば svc.login をコールしてログインする
   * 実装理由: login のコールバックラップを分離して可読性を高めるため
   * @param {any} svc - splunkjs の Service インスタンス
  * @returns {Promise<void>} - ログインが不要な場合は即座に解決する Promise
   */
  private _maybeLogin(svc: any) {
    return new Promise<void>((resolve, reject) => {
      if (this.username && this.password) {
        // splunk-sdk の login はコールバックベースなので Promise で包む
        // 型チェックを抑制して callback API を利用する
        // @ts-ignore
        svc.login((loginErr: any, success: any) => {
          if (loginErr) return reject(loginErr);
          return resolve();
        });
      } else {
        // 認証情報が無ければそのまま先へ進む
        return resolve();
      }
    });
  }

  /**
   * 処理名: 検索結果ボディの解析
   * 処理概要: oneshotSearch の返す結果（文字列や { body } など）を正規化してオブジェクトとして返す
   * 実装理由: 結果の形式が多様なため、解析ロジックを切り出して再利用性と可読性を高める
   * @param {any} results - oneshotSearch の返却値
   * @returns {any} 解析済みの body オブジェクト
   */
  private _parseResultsBody(results: any) {
    let body: any = results;
    if (typeof results === 'string') {
      body = JSON.parse(results);
    } else if (results && results.body) {
      try {
        body = JSON.parse(results.body);
      } catch {
        body = results.body;
      }
    }
    return body;
  }

  /**
   * Splunkで検索を実行します
   * 処理概要: クエリを正規化し、Splunkサービスに対してログイン（必要な場合）とoneshot検索を実行して結果を返す
   * 実装理由: 呼び出し側から単一のsearchメソッドで検索を実行できるようにし、レスポンスを正規化して返すため
   * @param {string} query - 検索クエリ
   * @returns {Promise<object>} - 検索結果（fields, rows, results）
   */
  async search(query: string) {
    if (!query) throw new SearchError('query required', { code: 'QUERY_REQUIRED' });
    if (!this.baseUrl) throw new SearchError('baseUrl required', { code: 'BASEURL_REQUIRED' });

    const qbody = this._normalizeQuery(query);
    let service = this._createService();

    // 実際の検索実行とリトライ処理は別メソッドへ委譲することで cognitive complexity を下げる
    return await this._executeSearchWithRetry(service, qbody);
  }

  /**
   * 処理名: 検索実行（リトライ含む）
   * 処理概要: _doLoginAndSearch を実行し、条件に応じて管理ポートでのリトライを行う
   * 実装理由: search メソッドの複雑度を下げ、リトライロジックを分離するため
   * @param {any} service - 初回に使用する Service インスタンス
   * @param {string} qbody - 正規化済みクエリ
  * @returns {Promise<any>} - 正規化された検索結果
   */
  private async _executeSearchWithRetry(service: any, qbody: string) {
    try {
      return await this._doLoginAndSearch(service, qbody);
    } catch (err: any) {
      // エラー処理は別メソッドへ委譲して分離する
      return await this._handleSearchError(err, qbody);
    }
  }

  /**
   * 処理名: 検索エラー処理
   * 処理概要: 検索失敗時のログ出力とリトライ判定・リトライ実行を行う
   * 実装理由: エラーハンドリングを分離して主要な処理の複雑度を下げるため
   * @param {any} err - 発生したエラー
   * @param {string} qbody - 正規化済みクエリ
   * @returns {Promise<any>} - 再試行成功時は結果を返し、失敗時は SearchError を投げる
   */
  private async _handleSearchError(err: any, qbody: string) {
    this.verbose && this.logger.debug('search exception', err);
    const text = (err && (err.message || err.cause || String(err))) ? String(err.message || err.cause || err) : '';
    const code = err && (err.code || (err.cause && err.cause.code));
    if (this._shouldRetry(text, code, err)) {
      return await this._retryWithMgmtPort(qbody);
    }
    if (err instanceof SearchError) throw err;
    throw new SearchError('network error', { code: 'NETWORK_ERROR', cause: err });
  }

  /**
   * 処理名: リトライ判定
   * 処理概要: エラー情報から再試行が必要かを判定する
   * 実装理由: 判定ロジックを分離して可読性を高めるため
   * @param {string} text - エラー本文またはメッセージ
   * @param {any} code - エラーコード
   * @param {any} err - 元のエラーオブジェクト
   * @returns {boolean} 再試行が必要であれば true
   */
  private _shouldRetry(text: string, code: any, err: any) {
    return (text && (text.includes('No session key') || text.includes('No session key available'))) || code === 'ECONNRESET' || (text && text.includes('socket hang up')) || (err && err.status === 600);
  }

  /**
   * 処理名: 管理ポートでのリトライ実行
   * 処理概要: management port を使って service を再生成し、再度検索を試みる
   * 実装理由: baseUrl が UI ポートを指していた場合に mgmt ポートで接続し直すため
  * @param {string} qbody - 正規化済みクエリ
  * @returns {Promise<any>} - 検索結果
   */
  private async _retryWithMgmtPort(qbody: string) {
    // ログは短絡評価で出力（分岐を減らすため）
    this.verbose && this.logger.debug('Retrying login/search using management port', this.mgmtPort);
    // 管理ポートを明示して再生成（簡素化して可読性を向上）
    const service = this._createService(Number(this.mgmtPort), 'https');
    return await this._doLoginAndSearch(service, qbody).catch(this._handleRetryError.bind(this));
  }

  /**
   * 処理名: リトライ失敗時のエラーハンドラ
   * 処理概要: ログ出力を行い SearchError を投げる
   * 実装理由: エラーハンドリングを分離して各関数の複雑度を下げるため
   * @param {any} err - 発生したエラー
   */
  private _handleRetryError(err: any): never {
    this.verbose && this.logger.debug('retry exception', err);
    throw new SearchError('search failed', { code: 'SEARCH_FAILED', cause: err });
  }
}
