import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeConsole } from '../../src/output/consoleWriter';

describe('consoleWriter extra', () => {
  // Given: 追加のコンソール表示振る舞い（行間挿入など）を検証する describe
  // When: 多数行のデータを渡したとき
  // Then: 10行目ごとに空行が挿入されるなどのフォーマットが適用されること
  let spy: jest.SpiedFunction<typeof console.log>;
  beforeEach(() => { spy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { spy.mockRestore(); jest.resetAllMocks(); });

  it('inserts blank line after 10 rows', () => {
    // Given（前提）: 12 行分のデータがある
    // When（操作）: writeConsole を呼ぶ
    // Then（期待）: ログ内に空文字列が含まれる（空行が挿入されている）
    const rows = [] as any[];
    for (let i = 0; i < 12; i++) rows.push({ a: i, b: `v${i}` });
    writeConsole(rows, false);
    // expect at least one empty string logged as blank separator
    const calls = spy.mock.calls.map(c => c[0]);
    expect(calls).toContain('');
  });
});
