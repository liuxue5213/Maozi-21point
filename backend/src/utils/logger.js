/**
 * 帽子21点 - 简单日志工具
 * 生产环境可替换为 winston/pino
 */

const isDev = process.env.NODE_ENV === 'development';

const logger = {
  info: (...args) => isDev && console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => isDev && console.warn('[WARN]', ...args),
};

module.exports = logger;
