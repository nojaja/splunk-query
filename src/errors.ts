/**
 * Splunk検索エラーを表すカスタムエラークラス
 */
/**
 * SearchErrorOptions - SearchError に与える追加情報
 */
export interface SearchErrorOptions {
  code?: string | number;
  meta?: any;
  cause?: Error;
}

/**
 * SearchError - Splunk検索時の専用エラークラス
 * message に加え code/meta/cause を保持できます
 */
export class SearchError extends Error {
  public cause?: Error;
  public code?: string | number;
  public meta?: any;

  /**
   * SearchErrorのコンストラクタ
   * @param {string} message - エラーメッセージ
   * @param {{code?: string|number, meta?: any, cause?: Error}} [options] - 追加情報
   */
  constructor(message: string, options?: SearchErrorOptions) {
    super(message);
    this.name = 'SearchError';
    if (options) {
      this.code = options.code;
      this.meta = options.meta;
      this.cause = options.cause;
    }
  }
}
