/**
 * 帽子21点 - Socket.IO 游戏通信
 * 处理实时游戏事件：匹配、下注、要牌、停牌等
 */

const { GameEngine, GameState } = require('../game/GameEngine');
const { AIPlayer } = require('../game/AIPlayer');

// 存储所有活跃游戏
const games = new Map();
// 匹配队列
const matchQueue = [];
// 玩家映射：socketId -> gameId
const playerGameMap = new Map();
// AI计时器
const aiTimers = new Map();

function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`玩家连接: ${socket.id}`);
    
    // 发送在线人数
    const onlineCount = io.engine.clientsCount;
    socket.emit('onlineCount', { count: onlineCount, matching: matchQueue.length });
    io.emit('onlineCount', { count: onlineCount, matching: matchQueue.length });

    // 玩家信息设置
    socket.on('setPlayer', (data) => {
      socket.playerName = data.name || '玩家' + socket.id.slice(0, 4);
      socket.playerId = socket.id;
      socket.emit('playerSet', { id: socket.id, name: socket.playerName });
    });

    // 人机对战 - 创建游戏
    socket.on('startPvE', () => {
      const gameId = `pve_${socket.id}`;
      const game = new GameEngine(gameId, 'pve');
      
      // 添加玩家
      game.addPlayer(socket.id, socket.playerName, 1000);
      
      // 添加AI (在PvE中确保人类玩家先行动)
      const ai = new AIPlayer('medium');
      game.addPlayer('ai_1', ai.name, 1000, true); // AI总是第二个行动
      
      games.set(gameId, game);
      playerGameMap.set(socket.id, gameId);
      
      // 开始游戏
      game.startRound();
      
      // 自动给AI下注
      const aiBet = ai.placeBet(1000, game.minBet);
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

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`玩家断开: ${socket.id}`);
      
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
