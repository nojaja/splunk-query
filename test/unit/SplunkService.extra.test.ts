import { jest, describe, it, expect } from '@jest/globals';
import { SplunkService } from '../../src/SplunkService';

const TEST_BASE_URL = 'http://localhost:8000';

describe('SplunkService private helpers', () => {
  it('_createService throws when baseUrl missing', () => {
    const s = new SplunkService({} as any);
    // clear baseUrl
    (s as any).baseUrl = undefined;
    expect(() => (s as any)._createService()).toThrow('baseUrl missing');
  });

  it('_getResultsArray picks results/result/entry', () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._getResultsArray({ results: [1] })).toEqual([1]);
    expect((s as any)._getResultsArray({ result: [2] })).toEqual([2]);
    expect((s as any)._getResultsArray({ entry: [3] })).toEqual([3]);
    expect((s as any)._getResultsArray({})).toBeNull();
  });

  it('_fieldsFromFirst handles arrays, objects and primitives', () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._fieldsFromFirst([10,20])).toEqual(['0','1']);
    expect((s as any)._fieldsFromFirst({ a:1, b:2 })).toEqual(['a','b']);
    expect((s as any)._fieldsFromFirst(null)).toEqual([]);
  });

  it('_rowFromResult handles array/object/primitive', () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._rowFromResult([1,2], ['0','1'])).toEqual([1,2]);
    expect((s as any)._rowFromResult({ a: 5, b: 6 }, ['a','b'])).toEqual([5,6]);
    expect((s as any)._rowFromResult('x', ['a'])).toEqual(['x']);
  });

  it('_parseResultsBody handles strings and body fields', () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._parseResultsBody(JSON.stringify({foo:1}))).toEqual({foo:1});
    expect((s as any)._parseResultsBody({ body: JSON.stringify({bar:2}) })).toEqual({bar:2});
    // non-json body should return raw body
    expect((s as any)._parseResultsBody({ body: 'notjson' })).toEqual('notjson');
  });

  it('_shouldRetry matches expected patterns', () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect((s as any)._shouldRetry('No session key', null, null)).toBe(true);
    expect((s as any)._shouldRetry('', 'ECONNRESET', null)).toBe(true);
    expect((s as any)._shouldRetry('socket hang up', null, null)).toBe(true);
    expect((s as any)._shouldRetry('', null, { status: 600 })).toBe(true);
    // falsy for non-matching cases
    expect((s as any)._shouldRetry('other', null, null)).toBeFalsy();
  });

  it('_maybeLogin rejects on login error', async () => {
    const s = new SplunkService({ baseUrl: TEST_BASE_URL, username: 'u', password: 'p' });
    const svc = { login: (cb: any) => cb(new Error('login fail')) };
    await expect((s as any)._maybeLogin(svc)).rejects.toThrow('login fail');
  });

  it('_handleSearchError retries when shouldRetry true', async () => {
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
  s._shouldRetry = jest.fn().mockReturnValue(true);
  s._retryWithMgmtPort = jest.fn(async () => ({ ok: true }));
    const res = await s._handleSearchError(new Error('No session key'), 'q');
    expect(s._retryWithMgmtPort).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('_handleSearchError throws SearchError when not retryable', async () => {
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
  s._shouldRetry = jest.fn().mockReturnValue(false);
    await expect(s._handleSearchError(new Error('other'), 'q')).rejects.toThrow();
  });

  it('_retryWithMgmtPort calls _doLoginAndSearch and handles retry error', async () => {
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    s.mgmtPort = 9999;
  s._createService = jest.fn().mockReturnValue({});
  s._doLoginAndSearch = jest.fn(async () => 'ok');
    const res = await s._retryWithMgmtPort('q');
    expect(s._doLoginAndSearch).toHaveBeenCalled();
    expect(res).toBe('ok');
  });

  it('constructor insecure mode sets env variable', () => {
    process.env.SPLUNK_SKIP_TLS_VERIFY = '1';
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    // NODE_TLS_REJECT_UNAUTHORIZED should be set to '0' in insecure mode
    expect((process.env as any).NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
    delete process.env.SPLUNK_SKIP_TLS_VERIFY;
  });

  it('_createService builds options correctly for token and credentials', () => {
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
    const splunk = require('splunk-sdk');
    splunk.Service = function (opts: any) { this.opts = opts; };
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL, token: 'T', verbose: true });
    expect(() => s._createService()).not.toThrow();
  });

  it('_oneshotSearchPromise rejects when svc returns err', async () => {
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    const svc = { oneshotSearch: (_q: any, _opts: any, cb: any) => cb(new Error('net'), null) };
    await expect(s._oneshotSearchPromise(svc, 'q')).rejects.toThrow('net');
  });

  it('_deriveFieldsAndRows returns empty rows when results not array', () => {
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    const out = (s as any)._deriveFieldsAndRows({ results: { a: 1 } });
    expect(out.rows).toEqual([]);
    expect(out.fields).toEqual([]);
  });

  it('_oneshotSearchPromise rejects when parse throws', async () => {
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    const svc = { oneshotSearch: (_q: any, _opts: any, cb: any) => cb(null, 'x') };
    // force parse error
    s._parseResultsBody = () => { throw new Error('parse error'); };
    await expect((s as any)._oneshotSearchPromise(svc, 'q')).rejects.toThrow('parse error');
  });

  it('_handleRetryError throws SearchError', () => {
    const s: any = new SplunkService({ baseUrl: TEST_BASE_URL });
    expect(() => s._handleRetryError(new Error('x'))).toThrow();
  });
});
