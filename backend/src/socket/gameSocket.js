/**
 * 帽子21点 - Socket.IO 主入口
 * 整合所有处理器
 */

const { GameState } = require('../game/GameEngine');
const { User } = require('../models/User');
const { initGameHandlers } = require('./handlers/gameHandlers');
const { initSocialHandlers } = require('./handlers/socialHandlers');
const logger = require('../utils/logger');

// 共享状态
const sharedState = {
  games: new Map(),
  matchQueue: [],
  playerGameMap: new Map(),
  playerChipsMap: new Map(),
  aiTimers: new Map(),
  broadcastGameState
};

function broadcastGameState(game, io) {
  for (const [pid, player] of game.players) {
    if (pid !== 'ai_1') {
      io.to(pid).emit('gameState', game.getState(pid));
    }
  }
}

function initSocket(io) {
  // 初始化社交处理器
  const socialHandler = initSocialHandlers(io);

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    logger.info(`玩家连接: ${socket.id}, 用户ID: ${userId}`);

    // 加载用户信息
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.error('❌ 用户不存在:', userId);
        socket.disconnect();
        return;
      }
      socket.playerName = user.username;
      socket.playerId = userId;
      socket.userChips = user.chips;
      sharedState.playerChipsMap.set(socket.id, user.chips);
      logger.info(`✅ 用户加载成功: ${user.username}, 筹码: ${user.chips}`);
    } catch (error) {
      logger.error('❌ 加载用户失败:', error);
      socket.disconnect();
      return;
    }

    // 发送初始数据
    const onlineCount = io.engine.clientsCount;
    socket.emit('onlineCount', { count: onlineCount, matching: sharedState.matchQueue.length });
    socket.emit('playerSet', { id: socket.id, name: socket.playerName, chips: socket.userChips });
    io.emit('onlineCount', { count: onlineCount, matching: sharedState.matchQueue.length });

    // 初始化游戏处理器
    const gameHandler = initGameHandlers(io, sharedState);
    gameHandler(socket);

    // 初始化社交处理器
    socialHandler(socket);

    // 断开连接
    socket.on('disconnect', async () => {
      logger.info(`玩家断开: ${socket.id}`);
      // 保存筹码
      const chips = sharedState.playerChipsMap.get(socket.id);
      if (chips !== undefined) {
        await User.setChips(userId, chips).catch(logger.error);
      }
      // 清理状态
      const matchIndex = sharedState.matchQueue.findIndex(p => p.id === socket.id);
      if (matchIndex !== -1) sharedState.matchQueue.splice(matchIndex, 1);
      sharedState.playerChipsMap.delete(socket.id);
      const gameId = sharedState.playerGameMap.get(socket.id);
      if (gameId) {
        const game = sharedState.games.get(gameId);
        if (game) {
          for (const [pid, player] of game.players) {
            if (pid !== socket.id && pid !== 'ai_1') {
              io.to(pid).emit('opponentLeft');
            }
          }
          sharedState.games.delete(gameId);
        }
        sharedState.playerGameMap.delete(socket.id);
      }
    });
  });
}

module.exports = { initSocket };
