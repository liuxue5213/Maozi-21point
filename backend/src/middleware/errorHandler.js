/**
 * 帽子21点 - 统一错误处理中间件
 */

const errorHandler = (err, req, res, next) => {
  console.error('❌ [Error]', err.message);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 异步错误包装器
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404处理
const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'API不存在' });
};

module.exports = { errorHandler, asyncHandler, notFoundHandler };
