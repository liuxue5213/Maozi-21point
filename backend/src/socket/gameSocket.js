/**
 * 帽子21点 - Socket.IO 游戏通信
 * 处理实时游戏事件：匹配、下注、要牌、停牌、好友对战、观战等
 * 新增：道具系统、比赛模式
 */

const { GameEngine, GameState } = require('../game/GameEngine');
const { AIPlayer } = require('../game/AIPlayer');
const { User } = require('../models/User');

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

// ============ 道具系统 ============
// 道具类型定义
const ITEM_TYPES = {
  hint: {
    name: '提示卡',
    description: '提示最佳操作',
    price: 100,
    icon: '💡',
    duration: 1 // 持续局数
  },
  double: {
    name: '双倍卡',
    description: '本局赢得双倍筹码',
    price: 300,
    icon: '💰',
    duration: 1
  },
  revive: {
    name: '复活卡',
    description: '筹码归零时自动使用，恢复500筹码',
    price: 500,
    icon: '🔄',
    autoUse: true
  },
  insurance: {
    name: '保险卡',
    description: '本局庄家Blackjack时返还50%下注',
    price: 200,
    icon: '🛡️',
    duration: 1
  },
  lucky: {
    name: '幸运卡',
    description: '本局Blackjack赔付提升至3:2',
    price: 400,
    icon: '🍀',
    duration: 1
  }
};

// 玩家道具库存：socketId -> { itemType: count }
const playerItems = new Map();

// 玩家激活的道具效果：socketId -> { itemType: active }
const activeEffects = new Map();

// ============ 比赛系统 ============
// 比赛列表
const tournaments = new Map();
// 比赛定时器
const tournamentTimers = new Map();

// 比赛状态
const TournamentStatus = {
  PENDING: 'pending',      // 等待开始
  ACTIVE: 'active',        // 进行中
  FINISHED: 'finished'     // 已结束
};

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
        
        // 加载用户道具库存（暂时禁用）
        // const items = await User.getUserItems(userId);
        // playerItems.set(socket.id, items);
        
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

    // 发送道具库存
    const userItems = playerItems.get(socket.id) || {};
    socket.emit('playerItems', { items: userItems, itemTypes: ITEM_TYPES });

    // 玩家信息设置（兼容旧版）
    socket.on('setPlayer', (data) => {
      if (socket.playerName) return; // 已通过认证加载
      socket.playerName = data.name || '玩家' + socket.id.slice(0, 4);
      socket.playerId = socket.id;
      socket.emit('playerSet', { id: socket.id, name: socket.playerName });
    });

    // ============ 人机对战 ============
    socket.on('startPvE', async (data) => {
      // 支持选择难度
      const difficulty = data?.difficulty || 'medium';
      const validDifficulties = ['easy', 'medium', 'hard'];
      const aiDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'medium';
      
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
                opponentName: `AI(${aiDifficulty})`,
                duration: duration
              });

              // 检查破产保护
              if (player.chips <= 0) {
                await handleBankruptcy(socket, io);
              }

              // 检查并更新每日任务进度
              await User.updateDailyTaskProgress(socket.userId, 'play_game');
              if (r.result === 'win' || r.result === 'blackjack') {
                await User.updateDailyTaskProgress(socket.userId, 'win_game');
                if (r.result === 'blackjack') {
                  await User.updateDailyTaskProgress(socket.userId, 'get_blackjack');
                }
              }

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

      // 添加AI (使用选择的难度)
      const ai = new AIPlayer(aiDifficulty);
      game.addPlayer('ai_1', ai.name, userChips, true);

      games.set(gameId, game);
      playerGameMap.set(socket.id, gameId);

      // 存储AI实例供后续使用
      game.aiInstance = ai;
      game.aiDifficulty = aiDifficulty;

      // 开始游戏
      game.startRound();

      // 自动给AI下注
      const aiBet = ai.placeBet(userChips, game.minBet);
      game.placeBet('ai_1', aiBet);

      socket.emit('gameCreated', { 
        gameId, 
        mode: 'pve',
        aiDifficulty,
        aiName: ai.name
      });
      socket.emit('gameState', game.getState(socket.id));

      // 包装executeAITurn以在AI操作后广播状态
      const originalExecuteAITurn = game.executeAITurn.bind(game);
      game.executeAITurn = (aiPlayer) => {
        console.log('🤖 gameSocket包装AI操作:', aiPlayer.id);
        originalExecuteAITurn(aiPlayer);

        // AI操作完成后广播状态
        setTimeout(() => {
          console.log('🤖 广播AI操作后的游戏状态');
          broadcastGameState(game, io);
        }, 2200);
      };
    });

    // ============ 玩家1V1匹配 ============
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

    // ============ 游戏操作 ============
    
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
          const ai = new AIPlayer(game.aiDifficulty || 'medium');
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

    // ============ 道具系统 ============
    
    // 使用道具
    socket.on('useItem', async (data) => {
      const { itemType } = data;
      
      // 验证道具类型
      if (!ITEM_TYPES[itemType]) {
        socket.emit('itemError', { message: '未知道具类型' });
        return;
      }

      // 检查是否有道具
      const items = playerItems.get(socket.id) || {};
      if (!items[itemType] || items[itemType] <= 0) {
        socket.emit('itemError', { message: '道具数量不足' });
        return;
      }

      // 根据道具类型处理效果
      let effectResult = { success: false, message: '' };
      
      switch (itemType) {
        case 'hint':
          effectResult = await useHintItem(socket, io);
          break;
        case 'double':
          effectResult = await useDoubleItem(socket);
          break;
        case 'revive':
          effectResult = await useReviveItem(socket, io);
          break;
        case 'insurance':
          effectResult = await useInsuranceItem(socket);
          break;
        case 'lucky':
          effectResult = await useLuckyItem(socket);
          break;
      }

      if (effectResult.success) {
        // 扣除道具
        items[itemType]--;
        playerItems.set(socket.id, items);
        await User.updateUserItem(socket.userId, itemType, -1);
        
        // 发送更新后的道具库存
        socket.emit('playerItems', { items, itemTypes: ITEM_TYPES });
        
        socket.emit('itemUsed', { 
          itemType, 
          message: effectResult.message,
          effect: effectResult.effect
        });
      } else {
        socket.emit('itemError', { message: effectResult.message });
      }
    });

    // 获取道具库存
    socket.on('getItems', () => {
      const items = playerItems.get(socket.id) || {};
      socket.emit('playerItems', { items, itemTypes: ITEM_TYPES });
    });

    // ============ 比赛系统 ============
    
    // 创建比赛
    socket.on('createTournament', async (data) => {
      const { name, maxPlayers = 8, entryFee = 100, startTime } = data;
      
      // 验证输入
      if (!name || name.trim().length === 0) {
        socket.emit('tournamentError', { message: '比赛名称不能为空' });
        return;
      }
      
      if (entryFee < 0) {
        socket.emit('tournamentError', { message: '报名费不能为负数' });
        return;
      }

      // 检查筹码是否足够支付报名费
      if (socket.userChips < entryFee) {
        socket.emit('tournamentError', { message: '筹码不足，无法创建比赛' });
        return;
      }

      try {
        const tournamentId = `tour_${Date.now()}_${socket.id.slice(0, 6)}`;
        const tournament = {
          id: tournamentId,
          name: name.trim(),
          creatorId: socket.id,
          creatorName: socket.playerName,
          maxPlayers: Math.min(maxPlayers, 16), // 最多16人
          entryFee,
          startTime: startTime || null, // null表示手动开始
          status: TournamentStatus.PENDING,
          players: [{
            id: socket.id,
            name: socket.playerName,
            chips: socket.userChips,
            eliminated: false
          }],
          prizePool: entryFee,
          createdAt: new Date().toISOString(),
          rounds: []
        };

        tournaments.set(tournamentId, tournament);

        // 如果设置了开始时间，创建定时器
        if (startTime) {
          const startAt = new Date(startTime).getTime();
          const now = Date.now();
          const delay = startAt - now;
          
          if (delay > 0) {
            const timer = setTimeout(() => {
              startTournament(tournamentId, io);
            }, delay);
            tournamentTimers.set(tournamentId, timer);
          } else {
            socket.emit('tournamentError', { message: '开始时间不能早于当前时间' });
            tournaments.delete(tournamentId);
            return;
          }
        }

        socket.emit('tournamentCreated', { tournament });
        socket.join(tournamentId);
        
        // 广播新比赛
        io.emit('tournamentList', { 
          tournaments: Array.from(tournaments.values()).filter(t => t.status === TournamentStatus.PENDING)
        });

        console.log(`🏆 创建比赛: ${tournament.name}, 创建者: ${socket.playerName}`);
      } catch (error) {
        console.error('❌ 创建比赛失败:', error);
        socket.emit('tournamentError', { message: '创建比赛失败' });
      }
    });

    // 加入比赛
    socket.on('joinTournament', async (data) => {
      const { tournamentId } = data;
      
      const tournament = tournaments.get(tournamentId);
      if (!tournament) {
        socket.emit('tournamentError', { message: '比赛不存在' });
        return;
      }

      if (tournament.status !== TournamentStatus.PENDING) {
        socket.emit('tournamentError', { message: '比赛已开始或已结束' });
        return;
      }

      // 检查是否已在比赛中
      if (tournament.players.find(p => p.id === socket.id)) {
        socket.emit('tournamentError', { message: '您已加入该比赛' });
        return;
      }

      // 检查人数是否已满
      if (tournament.players.length >= tournament.maxPlayers) {
        socket.emit('tournamentError', { message: '比赛人数已满' });
        return;
      }

      // 检查筹码是否足够
      if (socket.userChips < tournament.entryFee) {
        socket.emit('tournamentError', { message: '筹码不足，无法支付报名费' });
        return;
      }

      try {
        // 加入比赛
        tournament.players.push({
          id: socket.id,
          name: socket.playerName,
          chips: socket.userChips,
          eliminated: false
        });
        tournament.prizePool += tournament.entryFee;

        socket.join(tournamentId);
        socket.emit('tournamentJoined', { tournament });

        // 通知所有参赛者
        io.to(tournamentId).emit('tournamentUpdate', {
          tournament,
          message: `${socket.playerName} 加入了比赛`
        });

        console.log(`🏆 ${socket.playerName} 加入比赛: ${tournament.name}`);
      } catch (error) {
        console.error('❌ 加入比赛失败:', error);
        socket.emit('tournamentError', { message: '加入比赛失败' });
      }
    });

    // 开始比赛（仅创建者）
    socket.on('startTournament', (data) => {
      const { tournamentId } = data;
      const tournament = tournaments.get(tournamentId);
      
      if (!tournament) {
        socket.emit('tournamentError', { message: '比赛不存在' });
        return;
      }

      if (tournament.creatorId !== socket.id) {
        socket.emit('tournamentError', { message: '只有创建者可以开始比赛' });
        return;
      }

      if (tournament.players.length < 2) {
        socket.emit('tournamentError', { message: '至少需要2名玩家才能开始比赛' });
        return;
      }

      startTournament(tournamentId, io);
    });

    // 离开比赛
    socket.on('leaveTournament', (data) => {
      const { tournamentId } = data;
      const tournament = tournaments.get(tournamentId);
      
      if (!tournament || tournament.status !== TournamentStatus.PENDING) return;

      tournament.players = tournament.players.filter(p => p.id !== socket.id);
      socket.leave(tournamentId);
      
      io.to(tournamentId).emit('tournamentUpdate', {
        tournament,
        message: `${socket.playerName} 离开了比赛`
      });
    });

    // 获取比赛列表
    socket.on('getTournaments', () => {
      const tournamentList = Array.from(tournaments.values())
        .filter(t => t.status === TournamentStatus.PENDING)
        .map(t => ({
          id: t.id,
          name: t.name,
          creatorName: t.creatorName,
          playerCount: t.players.length,
          maxPlayers: t.maxPlayers,
          entryFee: t.entryFee,
          prizePool: t.prizePool,
          startTime: t.startTime
        }));
      
      socket.emit('tournamentList', { tournaments: tournamentList });
    });

    // 获取每日任务
    socket.on('getDailyTasks', async () => {
      try {
        const tasks = await User.getDailyTasks(socket.userId);
        socket.emit('dailyTasks', { tasks });
      } catch (error) {
        console.error('❌ 获取每日任务失败:', error);
      }
    });

    // 领取任务奖励
    socket.on('claimTaskReward', async (data) => {
      const { taskId } = data;
      try {
        const result = await User.claimTaskReward(socket.userId, taskId);
        if (result.success) {
          socket.userChips = result.chips;
          playerChipsMap.set(socket.id, result.chips);
          socket.emit('taskRewardClaimed', result);
          socket.emit('userInfo', { chips: result.chips });
        } else {
          socket.emit('taskError', { message: result.message });
        }
      } catch (error) {
        console.error('❌ 领取任务奖励失败:', error);
        socket.emit('taskError', { message: '领取奖励失败' });
      }
    });

    // ============ 断开连接 ============
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

      // 清除玩家数据
      playerChipsMap.delete(socket.id);
      playerItems.delete(socket.id);
      activeEffects.delete(socket.id);

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

// ============ 道具效果函数 ============

// 提示卡 - 获取最佳操作建议
async function useHintItem(socket, io) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) {
    return { success: false, message: '您不在游戏中' };
  }

  const game = games.get(gameId);
  if (!game || game.state !== GameState.PLAYING) {
    return { success: false, message: '当前游戏状态无法使用提示' };
  }

  const player = game.players.get(socket.id);
  if (!player || game.currentTurn !== socket.id) {
    return { success: false, message: '还没轮到您操作' };
  }

  // 使用困难AI计算最佳策略
  const { calculateHand } = require('../game/GameEngine');
  const dealerCard = game.dealer.cards[0];
  const canDouble = player.cards.length === 2 && player.chips >= player.bet;
  
  // 获取最佳操作建议
  const { AIPlayer } = require('../game/AIPlayer');
  const hardAI = new AIPlayer('hard');
  const bestMove = hardAI.decide(player.cards, dealerCard, canDouble);
  
  const hintMessages = {
    hit: '💡 建议：要牌（Hit）- 当前点数偏低，建议继续要牌',
    stand: '💡 建议：停牌（Stand）- 当前点数较好，建议停牌等待庄家',
    double: '💡 建议：加倍（Double）- 当前局势有利，建议加倍下注'
  };

  return {
    success: true,
    message: hintMessages[bestMove] || '暂无建议',
    effect: { type: 'hint', action: bestMove }
  };
}

// 双倍卡 - 本局赢得双倍筹码
async function useDoubleItem(socket) {
  let effects = activeEffects.get(socket.id) || {};
  effects.double = { active: true, expiresAfterRound: true };
  activeEffects.set(socket.id, effects);

  return {
    success: true,
    message: '💰 双倍卡已激活！本局获胜将获得双倍筹码',
    effect: { type: 'double', active: true }
  };
}

// 复活卡 - 筹码归零时使用
async function useReviveItem(socket, io) {
  const currentChips = playerChipsMap.get(socket.id) || 0;
  
  if (currentChips > 0) {
    return { success: false, message: '您还有筹码，无需复活' };
  }

  // 恢复500筹码
  const reviveAmount = 500;
  playerChipsMap.set(socket.id, reviveAmount);
  socket.userChips = reviveAmount;

  // 更新数据库
  await User.setChips(socket.userId, reviveAmount);

  return {
    success: true,
    message: `🔄 复活卡已使用！恢复 ${reviveAmount} 筹码`,
    effect: { type: 'revive', amount: reviveAmount }
  };
}

// 保险卡 - 庄家Blackjack时返还50%下注
async function useInsuranceItem(socket) {
  let effects = activeEffects.get(socket.id) || {};
  effects.insurance = { active: true };
  activeEffects.set(socket.id, effects);

  return {
    success: true,
    message: '🛡️ 保险卡已激活！若庄家Blackjack，返还50%下注',
    effect: { type: 'insurance', active: true }
  };
}

// 幸运卡 - Blackjack赔付提升至3:2
async function useLuckyItem(socket) {
  let effects = activeEffects.get(socket.id) || {};
  effects.lucky = { active: true };
  activeEffects.set(socket.id, effects);

  return {
    success: true,
    message: '🍀 幸运卡已激活！本局Blackjack赔付提升至3:2',
    effect: { type: 'lucky', active: true }
  };
}

// 处理破产保护
async function handleBankruptcy(socket, io) {
  try {
    const user = await User.findById(socket.userId);
    if (!user) return;

    // 检查是否有复活卡
    const items = playerItems.get(socket.id) || {};
    if (items.revive && items.revive > 0) {
      // 自动使用复活卡
      items.revive--;
      playerItems.set(socket.id, items);
      await User.updateUserItem(socket.userId, 'revive', -1);

      const reviveAmount = 500;
      playerChipsMap.set(socket.id, reviveAmount);
      socket.userChips = reviveAmount;
      await User.setChips(socket.userId, reviveAmount);

      socket.emit('autoRevive', { 
        message: '🔄 自动使用复活卡！恢复 500 筹码',
        chips: reviveAmount
      });
      socket.emit('playerItems', { items, itemTypes: ITEM_TYPES });
    } else {
      // 触发破产保护：免费领取1000筹码（每日一次）
      const canClaim = await User.checkBankruptcyProtection(socket.userId);
      if (canClaim) {
        const protectionAmount = 1000;
        playerChipsMap.set(socket.id, protectionAmount);
        socket.userChips = protectionAmount;
        await User.setChips(socket.userId, protectionAmount);
        await User.recordBankruptcyClaim(socket.userId);

        socket.emit('bankruptcyProtection', {
          message: '🛡️ 破产保护已触发！免费获得 1000 筹码',
          chips: protectionAmount
        });
      }
    }
  } catch (error) {
    console.error('❌ 处理破产失败:', error);
  }
}

// ============ 比赛系统函数 ============

// 开始比赛
function startTournament(tournamentId, io) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  tournament.status = TournamentStatus.ACTIVE;
  
  // 通知所有参赛者
  io.to(tournamentId).emit('tournamentStarted', {
    tournament,
    message: `比赛 "${tournament.name}" 开始了！`
  });

  console.log(`🏆 比赛开始: ${tournament.name}, 参赛人数: ${tournament.players.length}`);
}

// 结束比赛
function endTournament(tournamentId, io) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  tournament.status = TournamentStatus.FINISHED;
  
  // 计算排名和奖励
  const rankings = [...tournament.players].sort((a, b) => b.chips - a.chips);
  const prizes = calculatePrizes(tournament.prizePool, rankings.length);
  
  // 发放奖励
  rankings.forEach((player, index) => {
    const prize = prizes[index] || 0;
    io.to(player.id).emit('tournamentResult', {
      rank: index + 1,
      prize,
      totalPrizePool: tournament.prizePool
    });
  });

  io.to(tournamentId).emit('tournamentEnded', {
    tournament,
    rankings: rankings.map((p, i) => ({ ...p, rank: i + 1, prize: prizes[i] || 0 }))
  });
}

// 计算比赛奖金分配
function calculatePrizes(prizePool, playerCount) {
  if (playerCount < 2) return [prizePool];
  
  // 标准分配比例
  const distributions = {
    2: [0.7, 0.3],
    3: [0.5, 0.3, 0.2],
    4: [0.4, 0.25, 0.2, 0.15],
    8: [0.3, 0.2, 0.15, 0.1, 0.08, 0.07, 0.05, 0.05]
  };

  const dist = distributions[playerCount] || distributions[4];
  return dist.slice(0, playerCount).map(ratio => Math.floor(prizePool * ratio));
}

// ============ 广播游戏状态 ============
function broadcastGameState(game, io) {
  for (const [pid, player] of game.players) {
    if (pid !== 'ai_1') {
      io.to(pid).emit('gameState', game.getState(pid));
    }
  }
  
  // 同时广播给观战者
  const gameSpectators = spectators.get(game.gameId);
  if (gameSpectators) {
    gameSpectators.forEach(spectatorId => {
      io.to(spectatorId).emit('gameState', game.getState(null));
    });
  }
}

module.exports = { initSocket, ITEM_TYPES, TournamentStatus };
