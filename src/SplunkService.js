import nodeFetch from 'node-fetch';
import { SearchError } from './errors.js';
import { getLogger } from './utils/logger.js';

/**
 * Splunk検索サービスクラス
 */
export class SplunkService {
  /**
   * SplunkServiceのコンストラクタ
   * @param {object} config - 設定オブジェクト
   * @param {string} config.baseUrl - SplunkのベースURL
   * @param {string} config.token - 認証トークン
   * @param {string} config.username - ユーザー名
   * @param {string} config.password - パスワード
   * @param {boolean} config.verbose - 詳細ログ出力の有効/無効
   */
  constructor({ baseUrl, token, username, password, verbose } = {}) {
    this.baseUrl = baseUrl || process.env.SPLUNK_URL; // e.g. http://localhost:8000
    this.token = token || process.env.SPLUNK_TOKEN; // optional token for HEC or bearer
    this.username = username || process.env.SPLUNK_USER;
    this.password = password || process.env.SPLUNK_PASSWORD;
    this.mgmtPort = process.env.SPLUNK_MGMT_PORT || 8089;
    this.verbose = verbose || false;
    this.logger = getLogger(verbose);
  }

  /**
   * HTTP リクエストを実行します
   * @param {string} path - リクエストパス
   * @param {object} opts - リクエストオプション
   * @returns {Promise<Response>} - HTTPレスポンス
   */
  async _fetch(path, opts = {}) {
    const baseUrlMatch = this.baseUrl.replace(/:\/\/[^/]+/, match => match);
    const url = path.startsWith('http') ? path : `${baseUrlMatch}${path}`;
    const headers = opts.headers || {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    else if (this.username && this.password) {
      const credentials = `${this.username}:${this.password}`;
      const basicAuth = Buffer.from(credentials).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }
    try {
      if (this.verbose) this.logger.debug(`FETCH ${url} headers=${JSON.stringify(Object.keys(headers))}`);
      const res = await fetch(url, { ...opts, headers });
      if (this.verbose) this.logger.debug(`RESPONSE ${url} status=${res.status}`);
      return res;
    } catch (err) {
      if (this.verbose) this.logger.debug(`FETCH ERROR ${url} ${err.message}`);
      throw err;
    }
  }

  /**
   * 認証ヘッダーを生成します
   * @returns {object} - 認証ヘッダー
   */
  _authHeaders() {
    if (this.token) return { Authorization: `Bearer ${this.token}` };
    if (this.username && this.password) {
      const credentials = `${this.username}:${this.password}`;
      const basicAuth = Buffer.from(credentials).toString('base64');
      return { Authorization: `Basic ${basicAuth}` };
    }
    return {};
  }

  /**
   * Splunkジョブ検索URLを構築します
   * @returns {string} - ジョブ検索URL
   */
  _buildJobsUrl() {
    const u = new URL(this.baseUrl);
    const proto = 'https:';
    const hostname = u.hostname;
    return `${proto}//${hostname}:${this.mgmtPort}/services/search/jobs`;
  }

  /**
   * 検索クエリを正規化します
   * @param {string} query - 元の検索クエリ
   * @returns {string} - 正規化されたクエリ
   */
  _normalizeQuery(query) {
    const qtrim = query.trim();
    return qtrim.replace(/^search\s+/i, '');
  }

  /**
   * 使用するfetch関数を選択します
   * @returns {Function} - fetch関数
   */
  _pickFetch() {
    return (global.fetch || nodeFetch);
  }

  /**
   * Splunkにジョブを送信します
   * @param {Function} fetchFn - fetch関数
   * @param {string} jobsUrl - ジョブURL
   * @param {string} qbody - クエリボディ
   * @returns {Promise<Response>} - HTTPレスポンス
   */
  async _submitJob(fetchFn, jobsUrl, qbody) {
    this._logJobSubmission(jobsUrl, qbody);
    
    const res = await fetchFn(jobsUrl, {
      method: 'POST',
      headers: this._authHeaders(),
      body: new URLSearchParams({ search: `search ${qbody}`, output_mode: 'json' })
    });
    
    await this._logJobResponse(res, jobsUrl);
    return res;
  }

  /**
   * ジョブ送信のログを出力します
   * @param {string} jobsUrl - ジョブURL
   * @param {string} qbody - クエリボディ
   */
  _logJobSubmission(jobsUrl, qbody) {
    if (this.verbose) this.logger.debug(`POST ${jobsUrl}`);
    const searchBody = `search ${qbody}`;
    if (this.verbose) this.logger.debug(`final search body: ${searchBody}`);
  }

  /**
   * ジョブレスポンスのログを出力します
   * @param {Response} res - HTTPレスポンス
   * @param {string} jobsUrl - ジョブURL
   */
  async _logJobResponse(res, jobsUrl) {
    try {
      let bodyLen = 0;
      if (typeof res.text === 'function') {
        const txt = await res.text();
        bodyLen = (txt || '').length;
        if (!res.ok) console.error('[SplunkService] POST BODY:', txt);
      } else if (typeof res.json === 'function') {
        const obj = await res.json();
        bodyLen = JSON.stringify(obj).length;
      }
      if (this.verbose) this.logger.debug(`POST RESULT ${jobsUrl} ok=${res.ok} status=${res.status} body_len=${bodyLen}`);
    } catch (readErr) {
      if (this.verbose) this.logger.debug('error reading POST response body', readErr);
    }
  }

  /**
   * ジョブ送信からSIDを抽出します
   * @param {Response} res - HTTPレスポンス
   * @returns {Promise<string>} - ジョブSID
   */
  async _extractSidFromSubmit(res) {
    try {
      const bodyText = await this._getResponseBodyText(res);
      if (this.verbose) this.logger.debug(`job response text length=${bodyText.length}`);
      return this._extractSidFromBodyOrHeader(bodyText, res);
    } catch (err) {
      if (this.verbose) this.logger.debug('parse job response error', err);
      return this._extractSidFromHeader(res);
    }
  }

  /**
   * レスポンスボディまたはヘッダーからSIDを抽出します
   * @param {string} bodyText - レスポンスボディテキスト
   * @param {Response} res - HTTPレスポンス
   * @returns {string} - ジョブSID
   */
  _extractSidFromBodyOrHeader(bodyText, res) {
    // _getResponseBodyTextがsidを直接返した場合
    if (bodyText && typeof bodyText === 'string' && bodyText.trim() && !bodyText.includes('{') && !bodyText.includes('<')) {
      return bodyText.trim();
    }
    
    if (bodyText && bodyText.trim()) return this._extractSidFromBody(bodyText);
    return this._extractSidFromHeader(res);
  }

  /**
   * レスポンスからボディテキストを取得
   * @param {object} res - fetchレスポンスオブジェクト
   * @returns {Promise<string>} - レスポンスボディのテキスト
   */
  async _getResponseBodyText(res) {
    const textResult = await this._tryGetTextFromResponse(res);
    if (textResult.bodyText && textResult.bodyText.trim()) {
      return textResult.bodyText;
    }
    
    if (!textResult.triedJson && typeof res.json === 'function') {
      return await this._tryGetTextFromJson(res);
    }
    
    return textResult.bodyText;
  }

  /**
   * レスポンスからテキスト取得を試行
   * @param {object} res - fetchレスポンスオブジェクト
   * @returns {Promise<object>} - テキストとフラグを含むオブジェクト
   */
  async _tryGetTextFromResponse(res) {
    let bodyText = '';
    let triedJson = false;
    
    if (typeof res.text === 'function') {
      try {
        bodyText = await res.text();
      } catch (err) {
        if (err.message && err.message.includes('Body is unusable')) {
          triedJson = true;
        } else {
          throw err;
        }
      }
    }
    
    return { bodyText, triedJson };
  }

  /**
   * JSONレスポンスからテキスト取得を試行
   * @param {object} res - fetchレスポンスオブジェクト
   * @returns {Promise<string>} - JSONから変換したテキスト
   */
  async _tryGetTextFromJson(res) {
    try {
      const obj = await res.json();
      const sidFromObj = obj && (obj.sid || (obj.entry && obj.entry[0] && obj.entry[0].name));
      if (sidFromObj) return sidFromObj;
      return JSON.stringify(obj);
    } catch (err) {
      // ignore json parse error
      return '';
    }
  }

  /**
   * レスポンスボディからSIDを抽出
   * @param {string} bodyText - レスポンスボディのテキスト
   * @returns {string|undefined} - 抽出したSIDまたはundefined
   */
  _extractSidFromBody(bodyText) {
    const sidFromJson = this._trySidFromJson(bodyText);
    if (sidFromJson) return sidFromJson;
    return this._trySidFromXml(bodyText);
  }

  /**
   * JSONレスポンスからSIDを抽出しようと試行
   * @param {string} bodyText - JSON文字列
   * @returns {string|undefined} - 抽出したSIDまたはundefined
   */
  _trySidFromJson(bodyText) {
    try {
      const job = JSON.parse(bodyText);
      return job && (job.sid || (job.entry && job.entry[0] && job.entry[0].name));
    } catch {
      return undefined;
    }
  }

  /**
   * XMLレスポンスからSIDを抽出しようと試行
   * @param {string} bodyText - XML文字列
   * @returns {string|undefined} - 抽出したSIDまたはundefined
   */
  _trySidFromXml(bodyText) {
    const m1 = bodyText.match(/<sid>([^<]+)<\/sid>/);
    if (m1) return m1[1];
    const m2 = bodyText.match(/<entry[^>]*name="([^"]+)"/);
    return m2 ? m2[1] : undefined;
  }

  /**
   * HTTPレスポンスヘッダからSIDを抽出
   * @param {object} res - fetchレスポンスオブジェクト
   * @returns {string|undefined} - 抽出したSIDまたはundefined
   */
  _extractSidFromHeader(res) {
    const loc = res.headers && (res.headers.get ? (res.headers.get('location') || res.headers.get('Location')) : null);
    if (!loc) return undefined;
    const m = loc.match(/\/services\/search\/jobs\/(.+)$/);
    return m ? m[1] : undefined;
  }

  /**
   * ジョブの完了を待機
   * @param {Function} fetchFn - fetch関数
   * @param {string} jobStatusUrl - ジョブステータスのURL
   * @returns {Promise<boolean>} - ジョブが完了したかどうか
   */
  async _waitJobDone(fetchFn, jobStatusUrl) {
    for (let i = 0; i < 60; i++) {
      const s = await fetchFn(jobStatusUrl, { headers: this._authHeaders() });
      if (!s.ok) throw new SearchError(`job status fetch failed: ${s.status}`);
      const done = await this._isJobDone(s);
      if (done) return true;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }

  /**
   * ジョブが完了しているかチェック
   * @param {object} resp - fetchレスポンスオブジェクト
   * @returns {Promise<boolean>} - ジョブが完了しているかどうか
   */
  async _isJobDone(resp) {
    try {
      const sText = await resp.text();
      if (!this._hasText(sText)) return false;
      if (this.verbose) this.logger.debug('job status text=', sText);
      const sBody = JSON.parse(sText);
      const content = this._extractContent(sBody);
      if (!content) return false;
      if (this.verbose) this.logger.debug('job content=', JSON.stringify(content));
      return this._contentIndicatesDone(content);
    } catch (err) {
      if (this.verbose) this.logger.debug('job status parse error', err);
      return false;
    }
  }

  /**
   * コンテンツがジョブ完了を示しているかチェックします
   * @param {object} content - ジョブコンテンツ
   * @returns {boolean} - ジョブが完了しているかどうか
   */
  _contentIndicatesDone(content) {
    return content.dispatchState === 'DONE' ||
           content.isDone === true || content.isDone === '1' || content.isDone === 1 ||
           (typeof content.dispatchState === 'string' && content.dispatchState.toUpperCase().includes('DONE'));
  }

  /**
   * レスポンスボディからコンテントを抽出
   * @param {object} sBody - レスポンスボディオブジェクト
   * @returns {object|null} - 抽出したコンテントまたはnull
   */
  _extractContent(sBody) {
    return sBody && sBody.entry && sBody.entry[0] && sBody.entry[0].content ? sBody.entry[0].content : (sBody && sBody.content ? sBody.content : null);
  }

  /**
   * レスポンスボディからフィールドと行データを導出
   * @param {object} body - レスポンスボディオブジェクト
   * @returns {object} - fields、rows、resultsを含むオブジェクト
   */
  _deriveFieldsAndRows(body) {
    const results = this._getResultsArray(body);
    const normFields = this._normalizeFields(body, results);
    if (results && Array.isArray(results)) {
      const rows = results.map(r => this._rowFromResult(r, normFields));
      return { fields: normFields, rows, results };
    }
    return { fields: normFields, rows: [], results: null };
  }

  /**
   * レスポンスボディから結果配列を取得
   * @param {object} body - レスポンスボディオブジェクト
   * @returns {Array|null} - 結果配列またはnull
   */
  _getResultsArray(body) {
    return body && (body.results || body.result || body.entry) ? (body.results || body.result || body.entry) : null;
  }

  /**
   * フィールドを正規化
   * @param {object} body - レスポンスボディオブジェクト
   * @param {Array} results - 結果配列
   * @returns {Array} - 正規化されたフィールド配列
   */
  _normalizeFields(body, results) {
    if (body && body.fields) return body.fields;
    if (results && results.length) return this._fieldsFromFirst(results[0]);
    return [];
  }

  /**
   * 最初の結果からフィールドを抽出
   * @param {object|Array} first - 最初の結果アイテム
   * @returns {Array} - フィールド名の配列
   */
  _fieldsFromFirst(first) {
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
  _rowFromResult(r, normFields) {
    if (Array.isArray(r)) {
      // 値配列の場合はそのまま返す
      return r;
    }
    if (r && typeof r === 'object') {
      // オブジェクトの場合はフィールド名で値を取得
      return normFields.map(f => r[f]);
    }
    return [r];
  }

  /**
   * Splunkで検索を実行します
   * @param {string} query - 検索クエリ
   * @returns {Promise<object>} - 検索結果（fields, rows, results）
   */
  async search(query) {
    this._validateInputs(query);

    const { jobsUrl, fetchFn, qbody } = this._prepareSearch(query);
    const sid = await this._executeSearchJob(fetchFn, jobsUrl, qbody);
    const text = await this._getSearchResults(fetchFn, jobsUrl, sid);

    if (!this._hasText(text)) return { fields: [], rows: [] };
    if (this.verbose) this.logger.debug('results response full text=', text);
    const body = this._safeJsonParse(text);
    return this._deriveFieldsAndRows(body || {});
  }

  /**
   * 検索準備処理を行います
   * @param {string} query - 検索クエリ
   * @returns {object} - 準備済みの検索パラメータ
   */
  _prepareSearch(query) {
    let jobsUrl;
    try {
      jobsUrl = this._buildJobsUrl();
    } catch (err) {
      throw new SearchError('invalid baseUrl', err);
    }

    const fetchFn = this._pickFetch();
    const qbody = this._normalizeQuery(query);
    return { jobsUrl, fetchFn, qbody };
  }

  /**
   * 検索ジョブを実行してSIDを取得します
   * @param {Function} fetchFn - fetch関数
   * @param {string} jobsUrl - ジョブURL
   * @param {string} qbody - クエリボディ
   * @returns {Promise<string>} - ジョブSID
   */
  async _executeSearchJob(fetchFn, jobsUrl, qbody) {
    let res;
    try {
      res = await this._submitJob(fetchFn, jobsUrl, qbody);
    } catch (err) {
      if (this.verbose) this.logger.debug('POST ERROR', err);
      throw new SearchError('network error', err);
    }
    this._ensureOk(res, `search submit failed: ${res.status}`);

    const sid = await this._extractSidFromSubmit(res);
    this._ensureSid(sid);
    return sid;
  }

  /**
   * 検索結果を取得します
   * @param {Function} fetchFn - fetch関数
   * @param {string} jobsUrl - ジョブURL
   * @param {string} sid - ジョブSID
   * @returns {Promise<string>} - 結果テキスト
   */
  async _getSearchResults(fetchFn, jobsUrl, sid) {
    // Some environments can return results immediately; try direct results fetch first
    const immediateResultsUrl = `${new URL(jobsUrl).origin}/services/search/jobs/${sid}/results?output_mode=json&count=100`;
    let text = await this._fetchResultsText(fetchFn, immediateResultsUrl);
    if (!this._hasText(text)) {
      const jobStatusUrl = `${new URL(jobsUrl).origin}/services/search/jobs/${sid}?output_mode=json`;
      const jobDone = await this._waitJobDone(fetchFn, jobStatusUrl);
      this._ensureJobDone(jobDone);
      text = await this._fetchResultsText(fetchFn, immediateResultsUrl);
    }
    return text;
  }
}

// helpers extracted to reduce complexity in search
/**
 *
 */
export class _Internal {
}

/**
 * 入力値を検証します
 * @param {string} query - 検索クエリ
 * @throws {SearchError} - 入力値が無効な場合
 */
SplunkService.prototype._validateInputs = function(query) {
  if (!query) throw new SearchError('query required');
  if (!this.baseUrl) throw new SearchError('baseUrl required');
};

/**
 * HTTPレスポンスのOK状態を確認します
 * @param {Response} res - HTTPレスポンス
 * @param {string} msg - エラーメッセージ
 * @throws {SearchError} - レスポンスがOKでない場合
 */
SplunkService.prototype._ensureOk = function(res, msg) {
  if (!res || !res.ok) throw new SearchError(msg);
};

/**
 * SIDが存在することを確認します
 * @param {string} sid - ジョブSID
 * @throws {SearchError} - SIDが存在しない場合
 */
SplunkService.prototype._ensureSid = function(sid) {
  if (!sid) throw new SearchError('no sid returned or empty/unparsable job response');
};

/**
 * ジョブが完了していることを確認します
 * @param {boolean} done - ジョブ完了フラグ
 * @throws {SearchError} - ジョブが完了していない場合
 */
SplunkService.prototype._ensureJobDone = function(done) {
  if (!done) throw new SearchError('timeout waiting for job to complete');
};

/**
 * 検索結果テキストを取得します
 * @param {Function} fetchFn - fetch関数
 * @param {string} url - 結果取得URL
 * @returns {Promise<string>} - 結果テキスト
 */
SplunkService.prototype._fetchResultsText = async function(fetchFn, url) {
  const r = await fetchFn(url, { headers: this._authHeaders() });
  this._ensureOk(r, `results fetch failed: ${r && r.status}`);
  try {
    if (typeof r.text === 'function') return await r.text();
    if (typeof r.json === 'function') return JSON.stringify(await r.json());
    return '';
  } catch (err) {
    if (this.verbose) this.logger.debug('error reading results text', err); return '';
  }
};

/**
 * テキストが有効かどうかチェックします
 * @param {string} text - チェック対象のテキスト
 * @returns {boolean} - テキストが有効かどうか
 */
SplunkService.prototype._hasText = function(text) {
  return Boolean(text && text.trim());
};

/**
 * JSONテキストを安全にパースします
 * @param {string} text - パース対象のテキスト
 * @returns {object | null} - パース結果またはnull
 */
SplunkService.prototype._safeJsonParse = function(text) {
  try { return JSON.parse(text); } catch (err) { if (this.verbose) this.logger.debug('results not JSON, text length=', text.length); return null; }
};


