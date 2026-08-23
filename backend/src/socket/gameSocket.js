/**
 * 帽子21点 - Socket.IO 游戏通信
 * 处理实时游戏事件：匹配、下注、要牌、停牌、好友对战、观战等
 */

const { GameEngine, GameState } = require('../game/GameEngine');
const { AIPlayer } = require('../game/AIPlayer');
const User = require('../models/User');

// 存储所有活跃游戏
const games = new Map();
// 匹配队列
const matchQueue = [];
// 玩家映射：socketId -> gameId
const playerGameMap = new Map();
// 玩家筹码映射：socketId -> 实际筹码
const playerChipsMap = new Map();
// AI计时器
const aiTimers = new Map();
// 私人房间映射：roomId -> { gameId, hostId, guestId }
const privateRooms = new Map();
// 观战映射：gameId -> Set<socketId>
const spectators = new Map();

function initSocket(io) {
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`玩家连接: ${socket.id}, 用户ID: ${userId}`);

    // 从数据库加载用户信息
    try {
      const user = await User.findById(userId);
      if (user) {
        socket.playerName = user.username;
        socket.playerId = userId;
        socket.userChips = user.chips;
        playerChipsMap.set(socket.id, user.chips);
        console.log(`✅ 用户加载成功: ${user.username}, 筹码: ${user.chips}`);
      } else {
        console.error('❌ 用户不存在:', userId);
        socket.disconnect();
        return;
      }
    } catch (error) {
      console.error('❌ 加载用户失败:', error);
      socket.disconnect();
      return;
    }

    // 发送在线人数
    const onlineCount = io.engine.clientsCount;
    socket.emit('onlineCount', { count: onlineCount, matching: matchQueue.length });
    socket.emit('playerSet', { id: socket.id, name: socket.playerName, chips: socket.userChips });
    io.emit('onlineCount', { count: onlineCount, matching: matchQueue.length });

    // 玩家信息设置（兼容旧版）
    socket.on('setPlayer', (data) => {
      if (socket.playerName) return; // 已通过认证加载
      socket.playerName = data.name || '玩家' + socket.id.slice(0, 4);
      socket.playerId = socket.id;
      socket.emit('playerSet', { id: socket.id, name: socket.playerName });
    });

    // 人机对战 - 创建游戏
    socket.on('startPvE', async () => {
      const gameId = `pve_${socket.id}`;

      // 游戏结束回调 - 保存积分到数据库
      const onGameEnd = async (results, duration) => {
        for (const r of results) {
          if (r.playerId === socket.id) {
            try {
              // 更新用户筹码
              const player = game.players.get(socket.id);
              if (player) {
                await User.setChips(socket.userId, player.chips);
                playerChipsMap.set(socket.id, player.chips);
                socket.userChips = player.chips;
                console.log(`💰 游戏结束保存积分: ${socket.playerName} -> ${player.chips}`);
              }

              // 更新游戏统计
              await User.updateGameStats(socket.userId, r.result, r.chipsChange);

              // 添加游戏历史
              await User.addGameHistory(socket.userId, {
                gameMode: 'pve',
                result: r.result,
                chipsChange: r.chipsChange,
                opponentName: 'AI',
                duration: duration
              });

              // 发送更新后的用户信息给客户端
              socket.emit('userInfo', {
                chips: socket.userChips,
                level: (await User.findById(socket.userId))?.level || 1
              });
            } catch (error) {
              console.error('❌ 保存游戏结果失败:', error);
            }
          }
        }
      };

      const game = new GameEngine(gameId, 'pve', onGameEnd);

      // 使用用户实际筹码
      const userChips = socket.userChips || 1000;

      // 添加玩家
      game.addPlayer(socket.id, socket.playerName, userChips);

      // 添加AI (在PvE中确保人类玩家先行动)
      const ai = new AIPlayer('medium');
      game.addPlayer('ai_1', ai.name, userChips, true); // AI总是第二个行动

      games.set(gameId, game);
      playerGameMap.set(socket.id, gameId);

      // 开始游戏
      game.startRound();

      // 自动给AI下注
      const aiBet = ai.placeBet(userChips, game.minBet);
      game.placeBet('ai_1', aiBet);

      socket.emit('gameCreated', { gameId, mode: 'pve' });
      socket.emit('gameState', game.getState(socket.id));

      // 包装executeAITurn以在AI操作后广播状态
      const originalExecuteAITurn = game.executeAITurn.bind(game);
      game.executeAITurn = (aiPlayer) => {
        console.log('🤖 gameSocket包装AI操作:', aiPlayer.id);
        originalExecuteAITurn(aiPlayer);

        // AI操作完成后广播状态（2.2秒后：1秒思考 + 1秒操作 + 0.2秒缓冲）
        setTimeout(() => {
          console.log('🤖 广播AI操作后的游戏状态');
          broadcastGameState(game, io);
        }, 2200);
      };
    });

    // 玩家1V1匹配
    socket.on('startMatch', () => {
      // 检查匹配队列
      if (matchQueue.length > 0) {
        const opponent = matchQueue.shift();
        const gameId = `pvp_${opponent.id}_${socket.id}`;
        const game = new GameEngine(gameId, 'pvp');
        
        game.addPlayer(opponent.id, opponent.name, 1000);
        game.addPlayer(socket.id, socket.playerName, 1000);
        
        games.set(gameId, game);
        playerGameMap.set(opponent.id, gameId);
        playerGameMap.set(socket.id, gameId);
        
        game.startRound();
        
        opponent.emit('gameCreated', { gameId, mode: 'pvp', opponentName: socket.playerName });
        socket.emit('gameCreated', { gameId, mode: 'pvp', opponentName: opponent.name });
        
        opponent.emit('gameState', game.getState(opponent.id));
        socket.emit('gameState', game.getState(socket.id));
      } else {
        matchQueue.push({ id: socket.id, name: socket.playerName });
        socket.emit('waitingMatch');
      }
    });

    // 取消匹配
    socket.on('cancelMatch', () => {
      const index = matchQueue.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        matchQueue.splice(index, 1);
        socket.emit('matchCancelled');
      }
    });

    // 下注
    socket.on('placeBet', (data) => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;
      
      const game = games.get(gameId);
      if (!game || game.state !== GameState.BETTING) return;
      
      const success = game.placeBet(socket.id, data.amount);
      if (success) {
        // 检查是否所有玩家都已下注
        const allBet = [...game.players.values()].every(p => p.totalBet > 0 || p.allIn || p.chips === 0);
        if (allBet) {
          game.dealInitialCards();
        }
        
        // 广播状态
        broadcastGameState(game, io);
      }
    });

    // 要牌
    socket.on('hit', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;
      
      const game = games.get(gameId);
      if (!game) return;
      
      game.hit(socket.id);
      broadcastGameState(game, io);
    });

    // 停牌
    socket.on('stand', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;
      
      const game = games.get(gameId);
      if (!game) return;
      
      game.stand(socket.id);
      broadcastGameState(game, io);
    });

    // 加倍
    socket.on('doubleDown', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;
      
      const game = games.get(gameId);
      if (!game) return;
      
      game.doubleDown(socket.id);
      broadcastGameState(game, io);
    });

    // 开始下一轮
    socket.on('nextRound', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;
      
      const game = games.get(gameId);
      if (!game || game.state !== GameState.FINISHED) return;
      
      // 检查是否重新加入（金币为0则重置）
      for (const [pid, player] of game.players) {
        if (player.chips <= 0) {
          player.chips = 1000; // 重置金币
        }
      }
      
      game.startRound();
      
      // 如果是PvE，AI自动下注
      if (game.mode === 'pve') {
        const aiP = [...game.players.values()].find(p => p.id === 'ai_1');
        if (aiP) {
          const ai = new AIPlayer('medium');
          const aiBet = ai.placeBet(aiP.chips, game.minBet);
          game.placeBet('ai_1', aiBet);
        }
      }
      
      broadcastGameState(game, io);
    });

    // ========== 好友对战功能 ==========

    // 创建私人房间
    socket.on('createPrivateRoom', (data) => {
      const roomId = `private_${socket.id}`;
      const gameId = roomId;

      // 创建游戏房间
      const game = new GameEngine(gameId, 'private');
      const userChips = socket.userChips || 1000;
      game.addPlayer(socket.id, socket.playerName, userChips);

      games.set(gameId, game);
      playerGameMap.set(socket.id, gameId);
      privateRooms.set(roomId, { gameId, hostId: socket.id, guestId: null });

      socket.emit('privateRoomCreated', { roomId });
      console.log(`🏠 私人房间创建: ${roomId}, 房主: ${socket.playerName}`);
    });

    // 加入私人房间
    socket.on('joinPrivateRoom', (data) => {
      const { roomId } = data;
      const room = privateRooms.get(roomId);

      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      if (room.guestId) {
        socket.emit('error', { message: '房间已满' });
        return;
      }

      const game = games.get(room.gameId);
      if (!game) {
        socket.emit('error', { message: '游戏不存在' });
        return;
      }

      // 加入房间逻辑
      const userChips = socket.userChips || 1000;
      game.addPlayer(socket.id, socket.playerName, userChips);
      room.guestId = socket.id;
      playerGameMap.set(socket.id, room.gameId);

      // 开始游戏
      game.startRound();

      // 通知房主和加入者
      io.to(room.hostId).emit('gameCreated', { gameId: room.gameId, mode: 'private', opponentName: socket.playerName });
      socket.emit('gameCreated', { gameId: room.gameId, mode: 'private', opponentName: game.players.get(room.hostId)?.name });

      // 广播游戏状态
      broadcastGameState(game, io);

      console.log(`🏠 玩家加入私人房间: ${roomId}, 玩家: ${socket.playerName}`);
    });

    // 邀请好友
    socket.on('inviteFriend', (data) => {
      const { friendId } = data;
      io.to(friendId).emit('gameInvite', {
        from: socket.userId,
        fromName: socket.playerName
      });
      console.log(`📨 邀请好友: ${socket.playerName} -> ${friendId}`);
    });

    // 观战
    socket.on('spectate', (data) => {
      const { gameId } = data;
      const game = games.get(gameId);

      if (!game) {
        socket.emit('error', { message: '游戏不存在' });
        return;
      }

      // 观战逻辑
      if (!spectators.has(gameId)) {
        spectators.set(gameId, new Set());
      }
      spectators.get(gameId).add(socket.id);

      // 发送当前游戏状态给观战者
      socket.emit('spectating', { gameId });
      socket.emit('gameState', game.getState(null)); // null表示观战视角

      console.log(`👁️ 玩家观战: ${socket.playerName}, 游戏: ${gameId}`);
    });

    // 断开连接
    socket.on('disconnect', async () => {
      console.log(`玩家断开: ${socket.id}`);

      // 保存用户积分到数据库
      try {
        const currentChips = playerChipsMap.get(socket.id);
        if (currentChips !== undefined && socket.playerId) {
          await User.setChips(socket.playerId, currentChips);
          console.log(`💰 保存用户积分: ${socket.playerName} -> ${currentChips}`);
        }
      } catch (error) {
        console.error('❌ 保存积分失败:', error);
      }

      // 从匹配队列移除
      const index = matchQueue.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        matchQueue.splice(index, 1);
      }

      // 通知对手
      const gameId = playerGameMap.get(socket.id);
      if (gameId) {
        const game = games.get(gameId);
        if (game) {
          // 通知对手离开
          for (const [pid, player] of game.players) {
            if (pid !== socket.id && pid !== 'ai_1') {
              io.to(pid).emit('opponentLeft');
            }
          }
          games.delete(gameId);
        }
        playerGameMap.delete(socket.id);
      }

      // 清除玩家筹码映射
      playerChipsMap.delete(socket.id);

      // 清除AI计时器
      aiTimers.forEach((timer, key) => {
        if (key.includes(socket.id)) {
          clearTimeout(timer);
          aiTimers.delete(key);
        }
      });
    });
  });
}

// 广播游戏状态
function broadcastGameState(game, io) {
  for (const [pid, player] of game.players) {
    if (pid !== 'ai_1') {
      io.to(pid).emit('gameState', game.getState(pid));
    }
  }
}

module.exports = { initSocket };
