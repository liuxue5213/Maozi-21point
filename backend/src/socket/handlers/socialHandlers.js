/**
 * 帽子21点 - 社交处理器
 * 聊天、好友对战、私人房间
 */

function initSocialHandlers(io) {
  const privateRooms = new Map();

  return (socket) => {
    // 聊天
    socket.on('chat:message', (data) => {
      io.emit('chat:message', {
        userId: socket.userId,
        username: socket.playerName,
        message: data.message,
        timestamp: new Date().toISOString()
      });
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
      socket.join(room.id);
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
