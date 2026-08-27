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
let socketIO; // 保存io实例

function initGameHandlers(io, sharedState) {
  socketIO = io;
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
  if (!releaseFinishedGame(socket)) {
    return socket.emit('error', { message: '请先结束或离开当前对局' });
  }
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

  // 包装AI操作后广播状态，并在AI继续回合时循环决策
  const originalExecuteAITurn = game.executeAITurn.bind(game);
  game.executeAITurn = (aiPlayer) => {
    originalExecuteAITurn(aiPlayer);
    setTimeout(() => {
      broadcastGameState(game, socketIO);
      // AI要牌后仍未结束（还在AI回合），继续AI决策
      const aiP = game.players.get(aiPlayer.id);
      if (game.state === 'playing' && game.currentTurn === aiPlayer.id && aiP && !aiP.stood && !aiP.busted) {
        game.executeAITurn(aiPlayer);
      }
    }, 2200);
  };
}

async function handleMatch(socket, io) {
  if (!releaseFinishedGame(socket)) {
    return socket.emit('error', { message: '请先结束或离开当前对局' });
  }
  if (matchQueue.length > 0) {
    const opponent = matchQueue.shift();
    const gameId = `pvp_${opponent.id}_${socket.id}`;
    const onGameEnd = async (results, duration) => {
      for (const result of results) {
        const playerSocket = io.sockets.sockets.get(result.playerId);
        if (!playerSocket) continue;
        const opponentName = result.playerId === opponent.id ? socket.playerName : opponent.name;
        await saveGameResult(playerSocket, result, 'pvp', opponentName, duration);
      }
    };
    const game = new GameEngine(gameId, 'pvp', onGameEnd);

    game.addPlayer(opponent.id, opponent.name, opponent.chips);
    game.addPlayer(socket.id, socket.playerName, socket.userChips);

    games.set(gameId, game);
    playerGameMap.set(opponent.id, gameId);
    playerGameMap.set(socket.id, gameId);

    game.startRound();

    opponent.socket.emit('gameCreated', { gameId, mode: 'pvp', opponentName: socket.playerName });
    socket.emit('gameCreated', { gameId, mode: 'pvp', opponentName: opponent.name });

    opponent.socket.emit('gameState', game.getState(opponent.id));
    socket.emit('gameState', game.getState(socket.id));
  } else {
    if (matchQueue.some(player => player.id === socket.id) || playerGameMap.has(socket.id)) return;
    matchQueue.push({ id: socket.id, name: socket.playerName, chips: socket.userChips, socket });
    socket.emit('waitingMatch');
  }
}

// Finished and orphaned games must not prevent a player from starting another match.
function releaseFinishedGame(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return true;

  const game = games.get(gameId);
  if (game && game.state !== GameState.FINISHED) return false;

  if (game) {
    for (const playerId of game.players.keys()) playerGameMap.delete(playerId);
    games.delete(gameId);
  } else {
    playerGameMap.delete(socket.id);
  }
  return true;
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

  const success = game.placeBet(socket.id, data?.amount);
  if (success) {
    const allBet = [...game.players.values()].every(p => p.totalBet > 0 || p.allIn || p.chips === 0);
    if (allBet) game.dealInitialCards();
    broadcastGameState(game, socketIO);
  } else {
    socket.emit('error', { message: '下注金额无效，或本轮已下注' });
  }
}

function handleHit(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game) return;
  game.hit(socket.id);
  broadcastGameState(game, socketIO);
}

function handleStand(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game) return;
  game.stand(socket.id);
  broadcastGameState(game, socketIO);
}

function handleDoubleDown(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game) return;
  game.doubleDown(socket.id);
  broadcastGameState(game, socketIO);
}

async function handleNextRound(socket) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game || game.state !== GameState.FINISHED) return;

  game.startRound();

  if (game.mode === 'pve') {
    const aiP = [...game.players.values()].find(p => p.id === 'ai_1');
    if (aiP) {
      const ai = new AIPlayer(game.aiDifficulty || 'medium');
      const aiBet = ai.placeBet(aiP.chips, game.minBet);
      game.placeBet('ai_1', aiBet);
    }
  }

  broadcastGameState(game, socketIO);
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
    await User.updateDailyTaskProgress(socket.userId, 'play_game');
    if (result.result === 'win' || result.result === 'blackjack') {
      await User.updateDailyTaskProgress(socket.userId, 'win_game');
    }
    if (result.result === 'blackjack') {
      await User.updateDailyTaskProgress(socket.userId, 'get_blackjack');
    }
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
