/**
 * 帽子21点 - 社交处理器
 * 聊天、好友对战、私人房间
 */

const { dbAsync } = require('../../database/db');
const logger = require('../../utils/logger');

function initSocialHandlers(io) {
  const privateRooms = new Map();

  return (socket) => {
    // 聊天
    socket.on('chat:message', async (data) => {
      const msg = {
        userId: socket.userId,
        username: socket.playerName,
        message: String(data.message || '').slice(0, 200),
        timestamp: new Date().toISOString()
      };

      // 保存到数据库
      try {
        await dbAsync.run(
          'INSERT INTO chat_messages (user_id, username, message) VALUES (?, ?, ?)',
          [msg.userId, msg.username, msg.message]
        );
      } catch (error) {
        logger.error('保存聊天失败:', error);
      }

      io.emit('chat:message', msg);
    });

    // 创建私人房间
    socket.on('createPrivateRoom', (data) => {
      const roomId = `private_${socket.id}`;
      privateRooms.set(roomId, { hostId: socket.id, guestId: null });
      socket.join(roomId);
      socket.emit('privateRoomCreated', { roomId });
    });

    // 加入私人房间
    socket.on('joinPrivateRoom', (data) => {
      const { roomId } = data;
      const room = privateRooms.get(roomId);
      if (!room) return socket.emit('error', { message: '房间不存在' });
      if (room.guestId) return socket.emit('error', { message: '房间已满' });

      room.guestId = socket.id;
      socket.join(roomId);
      io.to(roomId).emit('privateRoomReady', { roomId });
    });

    // 邀请好友
    socket.on('inviteFriend', (data) => {
      const { friendId } = data;
      io.to(friendId).emit('gameInvite', {
        from: socket.userId,
        fromName: socket.playerName,
        roomId: `private_${socket.id}`
      });
    });
  };
}

module.exports = { initSocialHandlers };
