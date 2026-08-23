/**
 * 帽子21点 - 后端服务入口
 * 端口: 60215
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initSocket } = require('./socket/gameSocket');
const { socketAuthMiddleware } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const checkinRoutes = require('./routes/checkin');
const friendRoutes = require('./routes/friends');
const achievementRoutes = require('./routes/achievements');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

// 初始化数据库
require('./database/db');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 60215;

// CORS配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: '帽子21点', timestamp: new Date().toISOString() });
});

// API路由
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    service: '帽子21点后端',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// 认证和用户路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users/profile', profileRoutes);
app.use('/api/users/checkin', checkinRoutes);
app.use('/api/users/friends', friendRoutes);
app.use('/api/users/achievements', achievementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shop', shopRoutes);

// 静态文件服务（前端构建产物）
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// 前端路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Socket.IO配置
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO认证中间件
io.use(socketAuthMiddleware);

// 初始化Socket
initSocket(io);

// 错误处理（必须放在路由后面）
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║        🎩 帽子21点 后端服务 🎩        ║
  ║                                       ║
  ║   服务运行中...                        ║
  ║   端口: ${PORT}                         ║
  ║   http://0.0.0.0:${PORT}               ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
