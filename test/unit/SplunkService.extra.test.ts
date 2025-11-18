import { jest, describe, it, expect } from '@jest/globals';
import { SplunkService } from '../../src/SplunkService';

const TEST_BASE_URL = 'http://localhost:8000';

describe('SplunkService private helpers', () => {
  // Given: SplunkService の内部ヘルパー群のテスト
  // When: 各内部メソッドに対して異常/境界値を与える
  // Then: 期待される戻り値・例外が発生すること
  it('_createService throws when baseUrl missing', () => {
    // Given（前提）: baseUrl が未設定のインスタンス
    // When（操作）: _createService を呼ぶ
    // Then（期待）: baseUrl missing のエラーを投げる
    const s = new SplunkService({} as any);
    // clear baseUrl
    (s as any).baseUrl = undefined;
    expect(() => (s as any)._createService()).toThrow('baseUrl missing');
  });

  it('_getResultsArray picks results/result/entry', () => {
    // Given（前提）: さまざまなプロパティ名で結果が存在するオブジェクト
    // When（操作）: _getResultsArray を呼ぶ
    // Then（期待）: results/result/entry のいずれかを配列として返す
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._getResultsArray({ results: [1] })).toEqual([1]);
    expect((s as any)._getResultsArray({ result: [2] })).toEqual([2]);
    expect((s as any)._getResultsArray({ entry: [3] })).toEqual([3]);
    expect((s as any)._getResultsArray({})).toBeNull();
  });

  it('_fieldsFromFirst handles arrays, objects and primitives', () => {
    // Given（前提）: 最初の要素が配列/オブジェクト/プリミティブのケース
    // When（操作）: _fieldsFromFirst を呼ぶ
    // Then（期待）: 適切なフィールド名配列が返る
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._fieldsFromFirst([10,20])).toEqual(['0','1']);
    expect((s as any)._fieldsFromFirst({ a:1, b:2 })).toEqual(['a','b']);
    expect((s as any)._fieldsFromFirst(null)).toEqual([]);
  });

  it('_rowFromResult handles array/object/primitive', () => {
    // Given（前提）: 配列/オブジェクト/プリミティブの result
    // When（操作）: _rowFromResult を呼ぶ
    // Then（期待）: フィールド配列に対応した行配列が返る
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._rowFromResult([1,2], ['0','1'])).toEqual([1,2]);
    expect((s as any)._rowFromResult({ a: 5, b: 6 }, ['a','b'])).toEqual([5,6]);
    expect((s as any)._rowFromResult('x', ['a'])).toEqual(['x']);
  });

  it('_parseResultsBody handles strings and body fields', () => {
    // Given（前提）: JSON 文字列または { body: JSON } のケース
    // When（操作）: _parseResultsBody を呼ぶ
    // Then（期待）: JSON がパースされるか、非 JSON はそのまま返る
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._parseResultsBody(JSON.stringify({foo:1}))).toEqual({foo:1});
    expect((s as any)._parseResultsBody({ body: JSON.stringify({bar:2}) })).toEqual({bar:2});
    // non-json body should return raw body
    expect((s as any)._parseResultsBody({ body: 'notjson' })).toEqual('notjson');
  });

  it('_shouldRetry matches expected patterns', () => {
    // Given（前提）: エラーメッセージ/errno/ステータスの組合せ
    // When（操作）: _shouldRetry を呼ぶ
    // Then（期待）: 再試行すべき場合は true を返す
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._shouldRetry('No session key', null, null)).toBe(true);
    expect((s as any)._shouldRetry('', 'ECONNRESET', null)).toBe(true);
    expect((s as any)._shouldRetry('socket hang up', null, null)).toBe(true);
    expect((s as any)._shouldRetry('', null, { status: 600 })).toBe(true);
    // falsy for non-matching cases
    expect((s as any)._shouldRetry('other', null, null)).toBeFalsy();
  });

  it('_maybeLogin rejects on login error', async () => {
    // Given（前提）: login がエラーを返す svc
    // When（操作）: _maybeLogin を呼ぶ
    // Then（期待）: login エラーで拒否される
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'u', password: 'p' });
    const svc = { login: (cb: any) => cb(new Error('login fail')) };
    await expect((s as any)._maybeLogin(svc)).rejects.toThrow('login fail');
  });

  it('_handleSearchError retries when shouldRetry true', async () => {
    // Given（前提）: _shouldRetry が true を返すようにモックしている
    // When（操作）: _handleSearchError を呼ぶ
    // Then（期待）: _retryWithMgmtPort が呼ばれ再試行の結果を返す
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
  s._shouldRetry = jest.fn().mockReturnValue(true);
  s._retryWithMgmtPort = jest.fn(async () => ({ ok: true }));
    const res = await s._handleSearchError(new Error('No session key'), 'q');
    expect(s._retryWithMgmtPort).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('_handleSearchError throws SearchError when not retryable', async () => {
    // Given（前提）: _shouldRetry が false の場合
    // When（操作）: _handleSearchError を呼ぶ
    // Then（期待）: SearchError が投げられる
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
  s._shouldRetry = jest.fn().mockReturnValue(false);
    await expect(s._handleSearchError(new Error('other'), 'q')).rejects.toThrow();
  });

  it('_retryWithMgmtPort calls _doLoginAndSearch and handles retry error', async () => {
    // Given（前提）: _doLoginAndSearch が成功するようにモック
    // When（操作）: _retryWithMgmtPort を呼ぶ
    // Then（期待）: _doLoginAndSearch が呼ばれ、結果が返る
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    s.mgmtPort = 9999;
  s._createService = jest.fn().mockReturnValue({});
  s._doLoginAndSearch = jest.fn(async () => 'ok');
    const res = await s._retryWithMgmtPort('q');
    expect(s._doLoginAndSearch).toHaveBeenCalled();
    expect(res).toBe('ok');
  });

  it('constructor insecure mode sets env variable', () => {
    // Given（前提）: 環境変数 SPLUNK_SKIP_TLS_VERIFY がセットされている
    // When（操作）: インスタンスを生成する
    // Then（期待）: NODE_TLS_REJECT_UNAUTHORIZED が '0' に設定される
    process.env.SPLUNK_SKIP_TLS_VERIFY = '1';
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    // NODE_TLS_REJECT_UNAUTHORIZED should be set to '0' in insecure mode
    expect((process.env as any).NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
    delete process.env.SPLUNK_SKIP_TLS_VERIFY;
  });

  it('_createService builds options correctly for token and credentials', () => {
    // Given（前提）: token または username/password を与えたインスタンス
    // When（操作）: _createService を呼ぶ
    // Then（期待）: opts に token/username/password が含まれる
    // stub splunk-sdk Service constructor
    const splunk = require('splunk-sdk');
    splunk.Service = function (opts: any) { this.opts = opts; };

    const withToken: any = new SplunkService({ baseUrl: TEST_BASE_URL, token: 'T' });
    const svc1: any = (withToken as any)._createService();
    expect(svc1.opts.token).toBe('T');

    const withCreds: any = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'u', password: 'p' });
    const svc2: any = (withCreds as any)._createService();
    expect(svc2.opts.username).toBe('u');
    expect(svc2.opts.password).toBe('p');
  });

  it('_createService debug branch when verbose', () => {
    // Given（前提）: verbose=true のインスタンス
    // When（操作）: _createService を呼ぶ
    // Then（期待）: 例外が発生しない
    const splunk = require('splunk-sdk');
    splunk.Service = function (opts: any) { this.opts = opts; };
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL, token: 'T', verbose: true });
    expect(() => s._createService()).not.toThrow();
  });

  it('_oneshotSearchPromise rejects when svc returns err', async () => {
    // Given（前提）: svc の oneshotSearch が err を返す
    // When（操作）: _oneshotSearchPromise を呼ぶ
    // Then（期待）: reject される（エラーが伝播する）
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    const svc = { oneshotSearch: (_q: any, _opts: any, cb: any) => cb(new Error('net'), null) };
    await expect(s._oneshotSearchPromise(svc, 'q')).rejects.toThrow('net');
  });

  it('_deriveFieldsAndRows returns empty rows when results not array', () => {
    // Given（前提）: results が配列でないオブジェクト
    // When（操作）: _deriveFieldsAndRows を呼ぶ
    // Then（期待）: fields/rows が空で返る
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    const out = (s as any)._deriveFieldsAndRows({ results: { a: 1 } });
    expect(out.rows).toEqual([]);
    expect(out.fields).toEqual([]);
  });

  it('_oneshotSearchPromise rejects when parse throws', async () => {
    // Given（前提）: 解析処理が例外を投げるように差し替えたインスタンス
    // When（操作）: _oneshotSearchPromise を呼ぶ
    // Then（期待）: 解析エラーが伝播して reject される
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    const svc = { oneshotSearch: (_q: any, _opts: any, cb: any) => cb(null, 'x') };
    // force parse error
    s._parseResultsBody = () => { throw new Error('parse error'); };
    await expect((s as any)._oneshotSearchPromise(svc, 'q')).rejects.toThrow('parse error');
  });

  it('_handleRetryError throws SearchError', () => {
    // Given（前提）: リトライ時にエラーが起きた場合
    // When（操作）: _handleRetryError を呼ぶ
    // Then（期待）: SearchError が投げられる
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect(() => s._handleRetryError(new Error('x'))).toThrow();
  });
});
