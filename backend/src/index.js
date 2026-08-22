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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 60215;

// CORS配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
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

// 初始化Socket
initSocket(io);

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
