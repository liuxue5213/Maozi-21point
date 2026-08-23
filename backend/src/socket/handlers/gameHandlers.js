/**
 * 帽子21点 - 游戏处理器
 * 处理人机对战、匹配、下注、要牌、停牌等
 */

const { GameEngine, GameState } = require('../../game/GameEngine');
const { AIPlayer } = require('../../game/AIPlayer');
const { User } = require('../../models/User');
const logger = require('../../utils/logger');

// 共享状态（从主socket文件导入）
let games, matchQueue, playerGameMap, playerChipsMap, aiTimers;
let broadcastGameState;

function initGameHandlers(io, sharedState) {
  games = sharedState.games;
  matchQueue = sharedState.matchQueue;
  playerGameMap = sharedState.playerGameMap;
  playerChipsMap = sharedState.playerChipsMap;
  aiTimers = sharedState.aiTimers;
  broadcastGameState = sharedState.broadcastGameState;

  return (socket) => {
    // 人机对战
    socket.on('startPvE', async (data) => handlePvE(socket, io, data));
    // 1V1匹配
    socket.on('startMatch', () => handleMatch(socket, io));
    socket.on('cancelMatch', () => handleCancelMatch(socket));
    // 下注
    socket.on('placeBet', (data) => handlePlaceBet(socket, data));
    // 要牌
    socket.on('hit', () => handleHit(socket));
    // 停牌
    socket.on('stand', () => handleStand(socket));
    // 加倍
    socket.on('doubleDown', () => handleDoubleDown(socket));
    // 下一轮
    socket.on('nextRound', () => handleNextRound(socket));
    // 观战
    socket.on('spectate', (data) => handleSpectate(socket, io, data));
  };
}

async function handlePvE(socket, io, data) {
  const difficulty = data?.difficulty || 'medium';
  const validDifficulties = ['easy', 'medium', 'hard'];
  const aiDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'medium';
  const gameId = `pve_${socket.id}`;

  // 游戏结束回调
  const onGameEnd = async (results, duration) => {
    for (const r of results) {
      if (r.playerId === socket.id) {
        await saveGameResult(socket, r, 'pve', `AI(${aiDifficulty})`, duration);
      }
    }
  };

  const game = new GameEngine(gameId, 'pve', onGameEnd);
  const userChips = socket.userChips || 1000;

  game.addPlayer(socket.id, socket.playerName, userChips);
  const ai = new AIPlayer(aiDifficulty);
  game.addPlayer('ai_1', ai.name, userChips, true);

  games.set(gameId, game);
  playerGameMap.set(socket.id, gameId);
  game.aiInstance = ai;
  game.aiDifficulty = aiDifficulty;

  game.startRound();
  const aiBet = ai.placeBet(userChips, game.minBet);
  game.placeBet('ai_1', aiBet);

  socket.emit('gameCreated', { gameId, mode: 'pve', aiDifficulty, aiName: ai.name });
  socket.emit('gameState', game.getState(socket.id));

  // 包装AI操作后广播状态
  const originalExecuteAITurn = game.executeAITurn.bind(game);
  game.executeAITurn = (aiPlayer) => {
    originalExecuteAITurn(aiPlayer);
    setTimeout(() => broadcastGameState(game, io), 2200);
  };
}

async function handleMatch(socket, io) {
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
}

function handleCancelMatch(socket) {
  const index = matchQueue.findIndex(p => p.id === socket.id);
  if (index !== -1) {
    matchQueue.splice(index, 1);
    socket.emit('matchCancelled');
  }
}

function handlePlaceBet(socket, data) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game || game.state !== GameState.BETTING) return;

  const success = game.placeBet(socket.id, data.amount);
  if (success) {
    const allBet = [...game.players.values()].every(p => p.totalBet > 0 || p.allIn || p.chips === 0);
    if (allBet) game.dealInitialCards();
    broadcastGameState(game, io);
  }
}

function handleHit(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game) return;
  game.hit(socket.id);
  broadcastGameState(game, io);
}

function handleStand(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game) return;
  game.stand(socket.id);
  broadcastGameState(game, io);
}

function handleDoubleDown(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game) return;
  game.doubleDown(socket.id);
  broadcastGameState(game, io);
}

async function handleNextRound(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game || game.state !== GameState.FINISHED) return;

  for (const [pid, player] of game.players) {
    if (player.chips <= 0) player.chips = 1000;
  }

  game.startRound();

  if (game.mode === 'pve') {
    const aiP = [...game.players.values()].find(p => p.id === 'ai_1');
    if (aiP) {
      const ai = new AIPlayer(game.aiDifficulty || 'medium');
      const aiBet = ai.placeBet(aiP.chips, game.minBet);
      game.placeBet('ai_1', aiBet);
    }
  }

  broadcastGameState(game, io);
}

function handleSpectate(socket, io, data) {
  const { gameId } = data;
  const game = games.get(gameId);
  if (!game) return;
  // 发送观战状态
  socket.emit('spectateState', { gameId, state: game.getState(socket.id) });
}

async function saveGameResult(socket, result, mode, opponent, duration) {
  try {
    const gameId = playerGameMap.get(socket.id);
    const game = games.get(gameId);
    const player = game?.players.get(socket.id);
    const currentChips = player?.chips ?? socket.userChips;
    
    await User.setChips(socket.userId, currentChips);
    playerChipsMap.set(socket.id, currentChips);
    socket.userChips = currentChips;

    await User.updateGameStats(socket.userId, result.result, result.chipsChange);
    await User.addGameHistory(socket.userId, {
      gameMode: mode,
      result: result.result,
      chipsChange: result.chipsChange,
      opponentName: opponent,
      duration
    });

    socket.emit('userInfo', {
      chips: socket.userChips,
      level: (await User.findById(socket.userId))?.level || 1
    });
  } catch (error) {
    logger.error('保存游戏结果失败:', error);
  }
}

module.exports = { initGameHandlers };
