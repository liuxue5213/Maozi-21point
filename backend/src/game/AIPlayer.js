/**
 * 帽子21点 - AI玩家模块
 * 使用基础策略（Basic Strategy）进行决策
 */

const { calculateHand, isBust } = require('./GameEngine');

class AIPlayer {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // easy | medium | hard
    this.name = this.generateName();
  }

  generateName() {
    const names = ['挑战者', '幸运星', '孤注一掷', '冷静者', '冒险家', '读牌大师', '黑马', '连胜王'];
    return names[Math.floor(Math.random() * names.length)];
  }

  // AI决策逻辑
  decide(playerCards, dealerVisibleCard, canDouble = true) {
    const playerScore = calculateHand(playerCards);
    const dealerValue = dealerVisibleCard.value;
    
    // 简单AI - 随机决策
    if (this.difficulty === 'easy') {
      if (playerScore >= 17) return 'stand';
      if (Math.random() < 0.3) return 'stand';
      return 'hit';
    }

    // 中等/困难AI - 基础策略
    // 简化版基础策略
    if (playerScore >= 17) return 'stand';
    if (playerScore <= 11) return canDouble && playerCards.length === 2 ? 'double' : 'hit';
    
    // 12-16点，看庄家明牌
    if (playerScore >= 12 && playerScore <= 16) {
      if (dealerValue >= 7) return 'hit';
      if (playerScore >= 15 && dealerValue >= 7) return 'hit';
      if (playerScore >= 13 && dealerValue <= 6) return 'stand';
      if (playerScore === 12 && dealerValue >= 4 && dealerValue <= 6) return 'stand';
      return dealerValue <= 6 ? 'stand' : 'hit';
    }

    return 'stand';
  }

  // AI下注逻辑
  placeBet(chips, minBet) {
    if (this.difficulty === 'easy') {
      // 简单：随机下注
      const multiplier = Math.floor(Math.random() * 5) + 1;
      return Math.min(minBet * multiplier, chips);
    }
    
    // 中等/困难：保守下注
    const baseBet = Math.floor(chips * 0.05);
    return Math.max(minBet, Math.min(baseBet, Math.floor(chips * 0.15)));
  }
}

module.exports = { AIPlayer };
