/**
 * Splunk検索エラーを表すカスタムエラークラス
 */
export class SearchError extends Error {
  /**
   * SearchErrorのコンストラクタ
   * @param {string} message - エラーメッセージ
   * @param {Error} [cause] - 原因となったエラー
   */
  constructor(message, cause) {
    super(message);
    this.name = 'SearchError';
    this.cause = cause;
  }
}
