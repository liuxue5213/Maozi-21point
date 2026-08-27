/**
 * 帽子21点 - 游戏引擎
 * 处理核心21点逻辑：发牌、计算点数、判断胜负
 */

const { Deck } = require('./Deck');

// 计算手牌点数
function calculateHand(cards) {
  // 安全检查：空数组或无效卡片
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return 0;
  }

  let total = 0;
  let aces = 0;

  for (const card of cards) {
    // 检查卡片是否有效
    if (!card || typeof card.value !== 'number') {
      continue;
    }
    total += card.value;
    if (card.rank === 'A') aces++;
  }

  // A可以当1点，如果爆牌则自动调整
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

// 判断是否为Blackjack（首两张即21点）
function isBlackjack(cards) {
  return cards.length === 2 && calculateHand(cards) === 21;
}

// 判断是否爆牌
function isBust(cards) {
  return calculateHand(cards) > 21;
}

// 游戏状态
const GameState = {
  WAITING: 'waiting',       // 等待开始
  BETTING: 'betting',       // 下注阶段
  PLAYING: 'playing',       // 游戏进行中
  DEALER: 'dealer',         // 庄家回合
  FINISHED: 'finished',     // 结束
};

class GameEngine {
  constructor(gameId, mode = 'pve', onGameEnd = null) {
    this.gameId = gameId;
    this.mode = mode; // 'pve' 人机 | 'pvp' 匹配
    this.deck = new Deck(6);
    this.state = GameState.WAITING;
    this.players = new Map(); // playerId -> playerData
    this.dealer = { cards: [], hidden: true };
    this.currentTurn = null;
    this.round = 0;
    this.minBet = 10;
    this.maxBet = 500;
    this.onGameEnd = onGameEnd; // 游戏结束回调
    this.startTime = Date.now();
  }

  addPlayer(playerId, playerName, chips = 1000, isAI = false) {
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      chips,
      cards: [],
      bet: 0,
      totalBet: 0,
      stood: false,
      busted: false,
      blackjack: false,
      allIn: false,
      result: null,
      winAmount: 0,
      roundStartingChips: chips,
      isAI: isAI, // 标记是否为AI玩家
    });
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  startRound() {
    this.round++;
    this.startTime = Date.now();
    this.dealer = { cards: [], hidden: true };
    this.state = GameState.BETTING;

    // 重置玩家状态
    for (const [id, player] of this.players) {
      player.roundStartingChips = player.chips;
      player.cards = [];
      player.bet = 0;
      player.totalBet = 0;
      player.stood = false;
      player.busted = false;
      player.blackjack = false;
      player.allIn = false;
      player.result = null;
      player.winAmount = 0;
    }
  }

  placeBet(playerId, amount) {
    const player = this.players.get(playerId);
    if (!player || this.state !== GameState.BETTING) return false;

    // Each player places one bet per round.  Socket payloads are untrusted.
    if (player.totalBet > 0 || !Number.isSafeInteger(amount) || amount <= 0) return false;

    amount = Math.min(amount, player.chips, this.maxBet);
    if (amount < this.minBet && amount !== player.chips) return false;
    
    player.chips -= amount;
    player.bet += amount;
    player.totalBet += amount;
    
    if (player.chips === 0) {
      player.allIn = true;
    }
    
    return true;
  }

  // 所有玩家下注完毕，开始发牌
  dealInitialCards() {
    this.state = GameState.PLAYING;

    // 每人发两张
    for (const [id, player] of this.players) {
      if (player.totalBet > 0 || player.allIn) {
        player.cards.push(this.deck.deal());
        player.cards.push(this.deck.deal());
        player.blackjack = isBlackjack(player.cards);
      }
    }

    // 庄家发两张（第二张暗牌）
    this.dealer.cards.push(this.deck.deal());
    this.dealer.cards.push(this.deck.deal());

    // Blackjack is settled automatically; those players do not receive a turn.
    const activePlayers = [...this.players.values()].filter(p => p.cards.length > 0);
    const playersNeedingTurn = activePlayers.filter(p => !p.blackjack);
    if (playersNeedingTurn.length === 0) {
      this.dealerPlay();
      return true;
    }

    // 在PvE中确保人类玩家先行动
    const humanPlayer = playersNeedingTurn.find(p => !p.isAI);
    const firstPlayer = humanPlayer || playersNeedingTurn[0];
    this.currentTurn = firstPlayer.id;
    if (firstPlayer.isAI) this.executeAITurn(firstPlayer);

    return true;
  }

  // 玩家要牌
  hit(playerId) {
    const player = this.players.get(playerId);
    if (!player || this.state !== GameState.PLAYING || this.currentTurn !== playerId) {
      return false;
    }

    player.cards.push(this.deck.deal());
    
    if (isBust(player.cards)) {
      player.busted = true;
      player.result = 'lose';
      this.nextTurn();
    } else if (calculateHand(player.cards) === 21) {
      this.stand(playerId);
    }

    return true;
  }

  // 玩家停牌
  stand(playerId) {
    const player = this.players.get(playerId);
    if (!player || this.state !== GameState.PLAYING || this.currentTurn !== playerId) {
      return false;
    }

    player.stood = true;
    this.nextTurn();
    return true;
  }

  // 加倍下注
  doubleDown(playerId) {
    const player = this.players.get(playerId);
    if (!player || this.state !== GameState.PLAYING || this.currentTurn !== playerId) {
      return false;
    }

    if (player.cards.length !== 2 || player.chips < player.bet) return false;

    player.chips -= player.bet;
    player.totalBet += player.bet;
    player.bet *= 2;
    player.allIn = player.chips === 0;

    // 加倍后只能再要一张
    player.cards.push(this.deck.deal());
    
    if (isBust(player.cards)) {
      player.busted = true;
      player.result = 'lose';
    }

    this.nextTurn();
    return true;
  }

  // 下一个玩家
  nextTurn() {
    const turnOrder = [...this.players.values()].filter(p => p.cards.length > 0);
    const currentIndex = turnOrder.findIndex(p => p.id === this.currentTurn);
    const nextPlayer = turnOrder.slice(currentIndex + 1)
      .find(p => !p.stood && !p.busted && !p.blackjack);

    if (nextPlayer) {
      this.currentTurn = nextPlayer.id;
      if (nextPlayer.isAI || nextPlayer.id.startsWith('ai_')) {
        console.log('🤖 检测到AI玩家，执行自动操作:', nextPlayer.id);
        // 注意：这里需要传递广播回调，但这在GameEngine中不可用
        // 实际广播由外部gameSocket处理
        this.executeAITurn(nextPlayer);
      }
    } else {
      // 所有玩家结束，庄家回合
      this.dealerPlay();
    }
  }

  // 执行AI回合操作
  executeAITurn(aiPlayer) {
    console.log('🤖 执行AI回合:', aiPlayer.id, '卡片数:', aiPlayer.cards.length);

    // 延迟执行，模拟思考时间
    setTimeout(() => {
      const dealerVisibleCard = this.dealer.cards[0];
      const canDouble = aiPlayer.cards.length === 2 && aiPlayer.chips >= aiPlayer.bet;

      console.log('🤖 AI决策输入:', {
        cards: aiPlayer.cards,
        dealerCard: dealerVisibleCard,
        canDouble
      });

      // 导入AI决策
      const { AIPlayer } = require('./AIPlayer');
      const ai = new AIPlayer('medium');
      const decision = ai.decide(aiPlayer.cards, dealerVisibleCard, canDouble);

      console.log('🤖 AI决策结果:', decision);

      // 执行AI决策
      let actionCompleted = false;
      switch (decision) {
        case 'hit':
          console.log('🤖 AI选择要牌');
          actionCompleted = this.hit(aiPlayer.id);
          break;
        case 'stand':
          console.log('🤖 AI选择停牌');
          actionCompleted = this.stand(aiPlayer.id);
          break;
        case 'double':
          console.log('🤖 AI选择加倍');
          actionCompleted = this.doubleDown(aiPlayer.id);
          break;
        default:
          console.log('🤖 AI默认停牌');
          actionCompleted = this.stand(aiPlayer.id);
      }

      console.log('🤖 AI操作完成:', actionCompleted);
    }, 1000); // 1秒思考时间
  }

  // 庄家回合
  dealerPlay() {
    this.state = GameState.DEALER;
    this.dealer.hidden = false;

    // 庄家停在所有 17 点（包括 soft 17）。
    while (calculateHand(this.dealer.cards) < 17) {
      this.dealer.cards.push(this.deck.deal());
    }

    this.determineWinners();
  }

  // 判定胜负
  determineWinners() {
    this.state = GameState.FINISHED;
    const dealerScore = calculateHand(this.dealer.cards);
    const dealerBust = isBust(this.dealer.cards);
    const dealerBJ = isBlackjack(this.dealer.cards);

    const results = [];

    for (const [id, player] of this.players) {
      const playerScore = calculateHand(player.cards);
      const playerBJ = player.blackjack;
      const initialChips = player.roundStartingChips;

      if (player.busted) {
        player.result = 'lose';
        player.winAmount = 0;
      } else if (playerBJ && dealerBJ) {
        player.result = 'push';
        player.chips += player.totalBet;
      } else if (playerBJ) {
        player.result = 'blackjack';
        player.winAmount = Math.floor(player.totalBet * 1.5);
        player.chips += player.totalBet + player.winAmount;
      } else if (dealerBust) {
        player.result = 'win';
        player.winAmount = player.totalBet;
        player.chips += player.totalBet * 2;
      } else if (playerScore > dealerScore) {
        player.result = 'win';
        player.winAmount = player.totalBet;
        player.chips += player.totalBet * 2;
      } else if (playerScore === dealerScore) {
        player.result = 'push';
        player.chips += player.totalBet;
      } else {
        player.result = 'lose';
        player.winAmount = 0;
      }

      // 记录结果用于回调
      if (!player.isAI) {
        results.push({
          playerId: id,
          result: player.result,
          chipsChange: player.chips - initialChips,
          winAmount: player.winAmount
        });
      }
    }

    // 触发游戏结束回调
    if (this.onGameEnd) {
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      this.onGameEnd(results, duration);
    }
  }

  // 获取提示（道具功能）
  getHint(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.cards.length === 0) return '暂无可用提示';

    const playerScore = calculateHand(player.cards);
    const dealerCard = this.dealer.cards[0];
    const dealerValue = dealerCard ? dealerCard.value : 0;
    const canDouble = player.cards.length === 2 && player.chips >= player.bet;

    // 基础策略提示
    if (playerScore >= 17) return '停牌（点数足够）';
    if (playerScore <= 11) return canDouble ? '建议加倍' : '建议要牌';
    if (playerScore >= 12 && playerScore <= 16) {
      if (dealerValue >= 7) return '建议要牌（庄家明牌较大）';
      return '建议停牌（庄家可能爆牌）';
    }
    return '建议停牌';
  }

  // 获取游戏状态（发送给客户端）
  getState(playerId = null) {
    const players = [];
    for (const [id, player] of this.players) {
      players.push({
        id: player.id,
        name: player.name,
        chips: player.chips,
        bet: player.bet,
        totalBet: player.totalBet,
        cards: (playerId && playerId === id) || this.state === GameState.FINISHED || this.state === GameState.DEALER
          ? player.cards
          : player.cards.map((c, i) => (i === 0 ? c : { hidden: true })),
        stood: player.stood,
        busted: player.busted,
        blackjack: player.blackjack,
        allIn: player.allIn,
        result: player.result,
        winAmount: player.winAmount,
        isAI: player.isAI, // 添加AI标识
      });
    }

    return {
      gameId: this.gameId,
      mode: this.mode,
      state: this.state,
      round: this.round,
      players,
      dealer: {
        cards: this.dealer.hidden && this.dealer.cards.length > 0
          ? [this.dealer.cards[0], { hidden: true }]
          : this.dealer.cards,
        score: this.dealer.hidden && this.dealer.cards.length > 0
          ? calculateHand([this.dealer.cards[0]])
          : calculateHand(this.dealer.cards),
      },
      currentTurn: this.currentTurn,
      minBet: this.minBet,
      maxBet: this.maxBet,
    };
  }
}

module.exports = { GameEngine, calculateHand, isBlackjack, isBust, GameState };
