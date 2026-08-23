/**
 * 帽子21点 - JWT认证中间件
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥（生产环境应使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'maozi-21point-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// 生成JWT Token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 验证JWT Token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// HTTP请求认证中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }

  req.userId = decoded.id;
  req.userRole = decoded.role;
  next();
}

// Socket.IO认证中间件
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('认证失败：未提供令牌'));
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return next(new Error('认证失败：令牌无效'));
  }

  socket.userId = decoded.id;
  socket.username = decoded.username;
  socket.userRole = decoded.role;
  next();
}

// 管理员权限检查中间件
function adminMiddleware(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// Socket.IO管理员权限检查
function socketAdminMiddleware(socket, next) {
  if (socket.userRole !== 'admin') {
    return next(new Error('需要管理员权限'));
  }
  next();
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateToken,
  verifyToken,
  authMiddleware,
  socketAuthMiddleware,
  adminMiddleware,
  socketAdminMiddleware
};
