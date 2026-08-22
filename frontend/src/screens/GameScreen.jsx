/**
 * 帽子21点 - 游戏主界面 (React Native Web)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';
import Hand from '../components/Hand';
import BettingControls from '../components/BettingControls';
import GameActions from '../components/GameActions';

const GameScreen = () => {
  const { gameState, playerId, gameMode, backToLobby } = useGameStore();

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingIcon}>🎩</Text>
        <Text style={styles.loadingText}>正在加载游戏...</Text>
      </View>
    );
  }

  const me = gameState.players.find(p => p.id === playerId);
  const opponents = gameState.players.filter(p => p.id !== playerId);
  const isBetting = gameState.state === 'betting';
  const isPlaying = gameState.state === 'playing';
  const isFinished = gameState.state === 'finished';
  const isDealerTurn = gameState.state === 'dealer';

  // 获取结果文本
  const getResultText = (result) => {
    switch (result) {
      case 'win': return '🎉 赢了!';
      case 'lose': return '😢 输了';
      case 'push': return '🤝 平局';
      case 'blackjack': return '🎰 BLACKJACK!';
      default: return '';
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'win': return '#2ecc71';
      case 'lose': return '#e74c3c';
      case 'push': return '#f39c12';
      case 'blackjack': return '#9b59b6';
      default: return '#6c757d';
    }
  };

  // 计算手牌点数
  const calcHand = (cards) => {
    if (!cards) return 0;
    let total = 0, aces = 0;
    for (const card of cards) {
      if (card.hidden) continue;
      total += card.value;
      if (card.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  };

  return (
    <View style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={backToLobby}>
          <Text style={styles.backBtnText}>← 退出</Text>
        </TouchableOpacity>
        <View style={styles.gameInfo}>
          <View style={styles.roundBadge}>
            <Text style={styles.roundText}>第 {gameState.round} 轮</Text>
          </View>
          <Text style={styles.modeText}>{gameMode === 'pve' ? '🤖 人机对战' : '⚔️ 1V1对战'}</Text>
        </View>
        <Text style={styles.chips}>💰 {me?.chips || 0}</Text>
      </View>

      {/* 游戏桌面 */}
      <ScrollView style={styles.table} contentContainerStyle={styles.tableContent}>
        {/* 庄家区域 */}
        <View style={styles.dealerArea}>
          <Hand
            cards={gameState.dealer.cards}
            score={gameState.dealer.score}
            label="庄家"
          />
        </View>

        {/* 中央信息 */}
        <View style={styles.centerInfo}>
          {isBetting && (
            <View style={[styles.statusBadge, { backgroundColor: '#d4edda' }]}>
              <Text style={styles.statusText}>🎲 请下注</Text>
            </View>
          )}
          {isPlaying && (
            <View style={[styles.statusBadge, { backgroundColor: '#d4edda' }]}>
              <Text style={styles.statusText}>🎯 游戏中</Text>
            </View>
          )}
          {isDealerTurn && (
            <View style={[styles.statusBadge, { backgroundColor: '#fff3cd' }]}>
              <Text style={styles.statusText}>🎩 庄家回合</Text>
            </View>
          )}
          {isFinished && (
            <View style={[styles.statusBadge, { backgroundColor: '#e2d5f1' }]}>
              <Text style={styles.statusText}>🏁 本局结束</Text>
            </View>
          )}
        </View>

        {/* 对手区域 */}
        <View style={styles.opponentsArea}>
          {opponents.map(opp => (
            <View key={opp.id} style={styles.opponentCard}>
              <View style={styles.opponentHeader}>
                <Text style={styles.opponentName}>{opp.name}</Text>
                <Text style={styles.opponentChips}>💰{opp.chips}</Text>
              </View>
              <View style={styles.miniCards}>
                {opp.cards.map((card, i) => (
                  <View key={i} style={[styles.miniCard, i > 0 && { marginLeft: -16 }, card.hidden && styles.miniCardHidden]}>
                    {!card.hidden && (
                      <Text style={[styles.miniCardText, (card.suit === '♥' || card.suit === '♦') && { color: '#e74c3c' }]}>
                        {card.rank}{card.suit}
                      </Text>
                    )}
                    {card.hidden && <Text style={{ fontSize: 14 }}>🎩</Text>}
                  </View>
                ))}
              </View>
              <View style={styles.opponentStatus}>
                {opp.busted && <Text style={{ color: '#e74c3c' }}>💥 爆牌</Text>}
                {opp.stood && <Text style={{ color: '#2ecc71' }}>✋ 停牌</Text>}
                {opp.blackjack && <Text style={{ color: '#9b59b6' }}>🎰 BJ!</Text>}
                {opp.result && (
                  <Text style={{ color: getResultColor(opp.result), fontWeight: '700' }}>
                    {getResultText(opp.result)}
                  </Text>
                )}
                {opp.totalBet > 0 && (
                  <Text style={styles.opponentBet}>下注: {opp.totalBet}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 我的区域 */}
        <View style={styles.myArea}>
          <Hand
            cards={me?.cards || []}
            score={calcHand(me?.cards || [])}
            label="我"
          />
          {/* 我的结果 */}
          {me?.result && (
            <View style={[styles.resultBadge, { backgroundColor: me.result === 'win' || me.result === 'blackjack' ? '#e8fdf5' : '#fde8e8' }]}>
              <Text style={[styles.resultText, { color: getResultColor(me.result) }]}>
                {getResultText(me.result)}
              </Text>
              {me.winAmount > 0 && (
                <Text style={[styles.winAmount, { color: getResultColor(me.result) }]}>+{me.winAmount}</Text>
              )}
            </View>
          )}
          {/* 当前下注 */}
          {me?.totalBet > 0 && (
            <Text style={styles.myBet}>下注: {me.totalBet}</Text>
          )}
        </View>
      </ScrollView>

      {/* 底部操作区 */}
      <View style={styles.controls}>
        {isBetting && <BettingControls gameState={gameState} playerId={playerId} />}
        {(isPlaying || isFinished || isDealerTurn) && <GameActions gameState={gameState} playerId={playerId} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingIcon: {
    fontSize: 48,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13,
    color: '#6c757d',
  },
  gameInfo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  roundBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#e8fdf5',
    borderRadius: 6,
  },
  roundText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27ae60',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6c757d',
  },
  chips: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f39c12',
  },
  table: {
    flex: 1,
  },
  tableContent: {
    padding: 16,
    gap: 12,
  },
  dealerArea: {
    alignItems: 'center',
  },
  centerInfo: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#155724',
  },
  opponentsArea: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  opponentCard: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 140,
  },
  opponentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  opponentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  opponentChips: {
    fontSize: 11,
    color: '#f39c12',
  },
  miniCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  miniCard: {
    width: 36,
    height: 50,
    borderRadius: 4,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 1,
  },
  miniCardHidden: {
    backgroundColor: '#2c3e50',
  },
  miniCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  opponentStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
  },
  opponentBet: {
    fontSize: 11,
    color: '#6c757d',
  },
  myArea: {
    alignItems: 'center',
    gap: 8,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
  },
  winAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  myBet: {
    fontSize: 13,
    color: '#6c757d',
  },
  controls: {
    flexShrink: 0,
  },
});

export default GameScreen;
