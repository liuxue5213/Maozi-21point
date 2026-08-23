/**
 * 帽子21点 - 聊天系统处理器
 * 处理世界聊天消息广播
 */

function initChatHandlers(io) {
  // 世界聊天
  io.on('connection', (socket) => {
    socket.on('chat:message', (data) => {
      io.emit('chat:message', {
        userId: socket.userId,
        username: socket.playerName,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });
  });
}

module.exports = { initChatHandlers };
