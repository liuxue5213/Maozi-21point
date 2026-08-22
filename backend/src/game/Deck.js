/**
 * 帽子21点 - 牌组模块
 * 管理扑克牌的创建、洗牌、发牌
 */

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

class Deck {
  constructor(numDecks = 6) {
    this.numDecks = numDecks;
    this.cards = [];
    this.init();
  }

  init() {
    this.cards = [];
    for (let d = 0; d < this.numDecks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push({ suit, rank, value: this.getCardValue(rank) });
        }
      }
    }
    this.shuffle();
  }

  getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseInt(rank);
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal() {
    if (this.cards.length < 20) {
      this.init(); // 牌不够了重新洗牌
    }
    return this.cards.pop();
  }

  remaining() {
    return this.cards.length;
  }
}

module.exports = { Deck, SUITS, RANKS };
