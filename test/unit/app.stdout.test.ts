import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { run } from '../../src/app';

describe('app.run stdout output', () => {
  // Given: stdout に出力する場合の振る舞いを確認する describe
  // When: out オプションが指定されていない場合
  // Then: stdout に適切な形式で出力されること
  beforeEach(() => { jest.restoreAllMocks(); });
  afterEach(() => { jest.resetAllMocks(); });

  it('writes json to stdout when out is not provided', async () => {
    // Given（前提）: JSON フォーマットが選択され、out 未指定
    // When（操作）: run を実行する
    // Then（期待）: stdout に整形済の JSON が書き込まれること
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    const res = await run({ query: 'x', format: 'json', service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
    const expected = JSON.stringify([{ a: 1 }], null, 2);
    expect(spy).toHaveBeenCalled();
    // last call should contain full JSON
    const calledWith = (spy.mock.calls[spy.mock.calls.length - 1] || [])[0];
    expect(String(calledWith)).toBe(expected);
  });

  it('writes csv to stdout when out is not provided', async () => {
    // Given（前提）: CSV フォーマットが選択され、out 未指定
    // When（操作）: run を実行する
    // Then（期待）: stdout にヘッダと値が含まれる CSV が出力されること
    const mockSvc: any = { search: async () => ({ fields: ['a'], rows: [[1]] }) };
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    const res = await run({ query: 'x', format: 'csv', service: mockSvc });
    expect(res).toEqual([{ a: 1 }]);
    expect(spy).toHaveBeenCalled();
    const calledWith = (spy.mock.calls[spy.mock.calls.length - 1] || [])[0];
    // CSV should include header and value on next line
    expect(String(calledWith)).toContain('a');
    expect(String(calledWith)).toContain('1');
    expect(String(calledWith)).toMatch(/a\n1/);
  });
});
