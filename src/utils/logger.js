import log4js from 'log4js';

// ログシステムの設定
const LOG_CONFIG = {
  appenders: {
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %m'
      }
    }
  },
  categories: {
    default: {
      appenders: ['console'],
      level: 'INFO'
    }
  }
};

let isConfigured = false;

/**
 * ログシステムを初期化
 * @param {boolean} verbose - verboseモードの有効/無効
 * @returns {object} - log4jsロガーインスタンス
 */
export function initLogger(verbose = false) {
  if (!isConfigured) {
    log4js.configure(LOG_CONFIG);
    isConfigured = true;
  }
  
  // verboseモードに応じてログレベルを調整
  const logger = log4js.getLogger();
  if (verbose) {
    logger.level = 'DEBUG';
  } else {
    logger.level = 'INFO';
  }
  
  return logger;
}

/**
 * ログ出力のユーティリティクラス
 */
export class Logger {
  /**
   * Loggerのコンストラクタ
   * @param {boolean} verbose - verboseモードの有効/無効
   */
  constructor(verbose = false) {
    this.logger = initLogger(verbose);
    this.verbose = verbose;
  }

/**
 * 情報ログを出力（常に表示）
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加引数
 */
  info(message, ...args) {
    this.logger.info(message, ...args);
  }

  /**
   * エラーログを出力（常に表示）
   * @param {string} message - ログメッセージ
   * @param {...any} args - 追加引数
   */
  error(message, ...args) {
    this.logger.error(message, ...args);
  }

  /**
   * 警告ログを出力（常に表示）
   * @param {string} message - ログメッセージ
   * @param {...any} args - 追加引数
   */
  warn(message, ...args) {
    this.logger.warn(message, ...args);
  }

  /**
   * デバッグログを出力（verboseモードでのみ表示）
   * @param {string} message - ログメッセージ
   * @param {...any} args - 追加引数
   */
  debug(message, ...args) {
    if (this.verbose) {
      this.logger.debug(`[詳細] ${message}`, ...args);
    }
  }

  /**
   * 詳細ログを出力（verboseモードでのみ表示）
   * @param {string} message - ログメッセージ
   * @param {...any} args - 追加引数
   */
  verbose(message, ...args) {
    this.debug(message, ...args);
  }

  /**
   * 進行状況ログを出力
   * @param {string} message - ログメッセージ
   * @param {...any} args - 追加引数
   */
  progress(message, ...args) {
    this.logger.info(`[進行] ${message}`, ...args);
  }

  /**
   * 成功ログを出力
   * @param {string} message - ログメッセージ
   * @param {...any} args - 追加引数
   */
  success(message, ...args) {
    this.logger.info(`[成功] ${message}`, ...args);
  }
}

/**
 * デフォルトのロガーインスタンスを取得
 * @param {boolean} verbose - verboseモードの有効/無効
 * @returns {Logger} - ロガーインスタンス
 */
export function getLogger(verbose = false) {
  return new Logger(verbose);
}

export default Logger;