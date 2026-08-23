/**
 * 帽子21点 - AI玩家模块
 * 支持三种难度：easy | medium | hard
 * 
 * easy: 简单AI，17点以上停牌，随机决策
 * medium: 中等AI，基础策略（Basic Strategy简化版）
 * hard: 困难AI，精确算牌策略（Hi-Lo算牌法）
 */

const { calculateHand, isBust } = require('./GameEngine');

class AIPlayer {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // easy | medium | hard
    this.name = this.generateName();
    
    // 算牌系统（仅hard难度使用）
    this.runningCount = 0;
    this.decksRemaining = 6; // 默认6副牌
    this.cardsSeen = 0;
  }

  generateName() {
    const namesByDifficulty = {
      easy: ['新手小王', '幸运儿', '冒失鬼', '乐观派'],
      medium: ['挑战者', '冷静者', '冒险家', '策略师'],
      hard: ['读牌大师', '算牌高手', '赌神', '连胜王']
    };
    const names = namesByDifficulty[this.difficulty] || namesByDifficulty.medium;
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * 获取难度配置
   */
  getDifficultyConfig() {
    const configs = {
      easy: {
        standThreshold: 17,
        randomChance: 0.3,
        useCount: false,
        aggression: 0.5, // 攻击性（下注激进程度）
        thinkTime: { min: 500, max: 1500 }
      },
      medium: {
        standThreshold: 17,
        useCount: false,
        aggression: 0.3,
        thinkTime: { min: 800, max: 2000 }
      },
      hard: {
        standThreshold: 17,
        useCount: true, // 使用算牌策略
        aggression: 0.2,
        thinkTime: { min: 1000, max: 2500 }
      }
    };
    return configs[this.difficulty] || configs.medium;
  }

  /**
   * AI决策逻辑
   * @param {Array} playerCards - AI的手牌
   * @param {Object} dealerVisibleCard - 庄家明牌
   * @param {boolean} canDouble - 是否可以加倍
   * @returns {string} 决策: 'hit' | 'stand' | 'double'
   */
  decide(playerCards, dealerVisibleCard, canDouble = true) {
    const config = this.getDifficultyConfig();
    const playerScore = calculateHand(playerCards);
    const dealerValue = dealerVisibleCard.value;

    // 简单AI - 随机决策
    if (this.difficulty === 'easy') {
      return this.easyStrategy(playerScore, config);
    }

    // 困难AI - 精确算牌策略
    if (this.difficulty === 'hard') {
      return this.hardStrategy(playerCards, dealerValue, canDouble, config);
    }

    // 中等AI - 基础策略
    return this.mediumStrategy(playerScore, dealerValue, canDouble, config);
  }

  /**
   * 简单AI策略
   * 17点以上停牌，否则随机决策
   */
  easyStrategy(playerScore, config) {
    // 爆牌检查
    if (playerScore >= 21) return 'stand';
    
    // 17点以上停牌
    if (playerScore >= config.standThreshold) return 'stand';
    
    // 随机决策（30%概率停牌）
    if (Math.random() < config.randomChance) return 'stand';
    
    return 'hit';
  }

  /**
   * 中等AI策略
   * 基于基础策略表（Basic Strategy简化版）
   */
  mediumStrategy(playerScore, dealerValue, canDouble, config) {
    // 硬牌策略（无A或A只能当1点）
    if (playerScore >= 17) return 'stand';
    if (playerScore <= 11) {
      // 11点以下必须要牌，11点可以加倍
      if (playerScore === 11 && canDouble) return 'double';
      return 'hit';
    }

    // 12-16点，看庄家明牌
    if (playerScore >= 12 && playerScore <= 16) {
      // 庄家明牌强（7-A），必须要牌
      if (dealerValue >= 7) return 'hit';
      
      // 庄家明牌弱（2-6），停牌让庄家爆牌
      if (dealerValue >= 2 && dealerValue <= 6) {
        // 13-16点弱牌停牌
        if (playerScore >= 13) return 'stand';
        // 12点只在庄家4-6时停牌
        if (playerScore === 12 && dealerValue >= 4) return 'stand';
        return 'hit';
      }
      
      return 'hit';
    }

    return 'stand';
  }

  /**
   * 困难AI策略
   * 使用Hi-Lo算牌法 + 精确基础策略
   */
  hardStrategy(playerCards, dealerValue, canDouble, config) {
    const playerScore = calculateHand(playerCards);
    const trueCount = this.getTrueCount();

    // 基础策略修正（根据真数调整）
    if (playerScore >= 17) return 'stand';
    if (playerScore <= 11) {
      // 算牌修正：真数高时更积极加倍
      if (playerScore === 11 && canDouble) return 'double';
      if (playerScore === 10 && canDouble && dealerValue <= 9) return 'double';
      if (playerScore === 9 && canDouble && dealerValue >= 2 && dealerValue <= 6) return 'double';
      return 'hit';
    }

    // 12-16点的精确策略
    if (playerScore >= 12 && playerScore <= 16) {
      // 算牌修正
      if (trueCount >= 2 && playerScore === 12 && dealerValue <= 3) return 'stand';
      if (trueCount >= 3 && playerScore === 13 && dealerValue <= 2) return 'stand';
      if (trueCount >= 1 && playerScore === 15 && dealerValue <= 6) return 'stand';
      if (trueCount >= 0 && playerScore === 16 && dealerValue <= 6) return 'stand';

      // 庄家强牌必须博
      if (dealerValue >= 7) return 'hit';
      
      // 庄家弱牌停牌
      if (dealerValue >= 2 && dealerValue <= 6) {
        if (playerScore >= 13) return 'stand';
        if (playerScore === 12 && dealerValue >= 4) return 'stand';
        return 'hit';
      }
      
      return 'hit';
    }

    return 'stand';
  }

  /**
   * 更新算牌计数
   * Hi-Lo算牌法：
   * 2-6: +1
   * 7-9: 0
   * 10-A: -1
   */
  updateCount(card) {
    if (this.difficulty !== 'hard') return;
    
    const value = card.value;
    if (value >= 2 && value <= 6) {
      this.runningCount += 1;
    } else if (value >= 10 || card.rank === 'A') {
      this.runningCount -= 1;
    }
    this.cardsSeen++;
    
    // 更新剩余牌堆数
    this.decksRemaining = Math.max(1, 6 - Math.floor(this.cardsSeen / 52));
  }

  /**
   * 获取真数（True Count）
   * 真数 = 跑数 / 剩余牌堆数
   */
  getTrueCount() {
    if (this.difficulty !== 'hard' || this.decksRemaining === 0) return 0;
    return this.runningCount / this.decksRemaining;
  }

  /**
   * 重置算牌状态
   */
  resetCount() {
    this.runningCount = 0;
    this.decksRemaining = 6;
    this.cardsSeen = 0;
  }

  /**
   * AI下注逻辑
   * @param {number} chips - 当前筹码
   * @param {number} minBet - 最小下注
   * @param {number} maxBet - 最大下注
   * @returns {number} 下注金额
   */
  placeBet(chips, minBet, maxBet = 500) {
    const config = this.getDifficultyConfig();

    if (this.difficulty === 'easy') {
      // 简单：随机下注
      const multiplier = Math.floor(Math.random() * 5) + 1;
      return Math.min(minBet * multiplier, chips, maxBet);
    }

    if (this.difficulty === 'hard') {
      // 困难：基于算牌的下注策略
      const trueCount = this.getTrueCount();
      let betMultiplier = 1;

      if (trueCount >= 4) {
        betMultiplier = 8; // 真数极高，重注
      } else if (trueCount >= 3) {
        betMultiplier = 5;
      } else if (trueCount >= 2) {
        betMultiplier = 3;
      } else if (trueCount >= 1) {
        betMultiplier = 2;
      } else {
        betMultiplier = 1; // 真数低，最小注
      }

      const bet = minBet * betMultiplier;
      return Math.min(Math.max(bet, minBet), chips, maxBet);
    }

    // 中等：保守下注策略
    const baseBet = Math.floor(chips * config.aggression);
    return Math.max(minBet, Math.min(baseBet, Math.floor(chips * 0.15), maxBet));
  }

  /**
   * 获取思考时间（模拟人类反应）
   */
  getThinkTime() {
    const config = this.getDifficultyConfig();
    const { min, max } = config.thinkTime;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 获取AI信息
   */
  getInfo() {
    return {
      name: this.name,
      difficulty: this.difficulty,
      ...(this.difficulty === 'hard' && {
        runningCount: this.runningCount,
        trueCount: this.getTrueCount().toFixed(2)
      })
    };
  }
}

module.exports = { AIPlayer };
