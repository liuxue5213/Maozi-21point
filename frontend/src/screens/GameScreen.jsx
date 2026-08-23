/**
 * 帽子21点 - 游戏主界面 (自然浅色风格)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';
import Hand from '../components/Hand';
import BettingControls from '../components/BettingControls';
import GameActions from '../components/GameActions';

const GameScreen = () => {
  const { gameState, playerId, gameMode, backToLobby } = useGameStore();
  const [score, setScore] = useState({ win: 0, lose: 0, draw: 0 });
  const [lastResult, setLastResult] = useState(null);

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

  // 监听结果变化，更新比分
  useEffect(() => {
    if (!gameState || gameState.state !== 'finished') return;

    const me = gameState.players.find(p => p.id === playerId);
    if (!me || !me.result || me.result === lastResult) return;

    setLastResult(me.result);

    if (me.result === 'win' || me.result === 'blackjack') {
      setScore(prev => ({ ...prev, win: prev.win + 1 }));
    } else if (me.result === 'lose') {
      setScore(prev => ({ ...prev, lose: prev.lose + 1 }));
    } else if (me.result === 'push') {
      setScore(prev => ({ ...prev, draw: prev.draw + 1 }));
    }
  }, [gameState, playerId, lastResult]);

  // 重置比分（新一轮游戏时）
  useEffect(() => {
    if (gameState?.state === 'betting' && gameState.round === 1) {
      setScore({ win: 0, lose: 0, draw: 0 });
      setLastResult(null);
    }
  }, [gameState?.round]);

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const me = gameState.players.find(p => p.id === playerId);
  const opponents = gameState.players.filter(p => p.id !== playerId);
  const isBetting = gameState.state === 'betting';
  const isPlaying = gameState.state === 'playing';
  const isFinished = gameState.state === 'finished';
  const isDealerTurn = gameState.state === 'dealer';

  const getResultText = (result) => {
    switch (result) {
      case 'win': return '获胜';
      case 'lose': return '失败';
      case 'push': return '平局';
      case 'blackjack': return 'Blackjack!';
      default: return '';
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'win': return '#5b8c5a';
      case 'lose': return '#c9584a';
      case 'push': return '#7a7068';
      case 'blackjack': return '#8b5cf6';
      default: return '#a89f94';
    }
  };

  return (
    <View style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={backToLobby}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.scoreText}>胜{score.win} 负{score.lose} 平{score.draw}</Text>
          <Text style={styles.modeText}>{gameMode === 'pve' ? '人机对战' : '1V1对战'}</Text>
        </View>
        <Text style={styles.chips}>💰{me?.chips || 0}</Text>
      </View>

      {/* 游戏桌面 */}
      <ScrollView style={styles.table} contentContainerStyle={styles.tableContent} showsVerticalScrollIndicator={false}>
        {/* 庄家 */}
        <View style={styles.dealerArea}>
          <Hand cards={gameState.dealer.cards} score={gameState.dealer.score} label="庄家" />
        </View>

        {/* 状态 */}
        <View style={styles.statusArea}>
          {isBetting && <Text style={styles.statusText}>请下注</Text>}
          {isPlaying && <Text style={styles.statusText}>游戏中</Text>}
          {isDealerTurn && <Text style={styles.statusText}>庄家回合</Text>}
          {isFinished && <Text style={styles.statusText}>本局结束</Text>}
        </View>

        {/* 对手 */}
        <View style={styles.opponents}>
          {opponents.map(opp => (
            <View key={opp.id} style={styles.oppCard}>
              <View style={styles.oppHeader}>
                <Text style={styles.oppName}>{opp.name}</Text>
                <Text style={styles.oppChips}>💰{opp.chips}</Text>
              </View>
              <View style={styles.oppCards}>
                {opp.cards.map((c, i) => (
                  <View key={i} style={[styles.miniCard, c.hidden && styles.miniCardHidden]}>
                    {!c.hidden && (
                      <Text style={[styles.miniCardText, (c.suit === '♥' || c.suit === '♦') && { color: '#b83030' }]}>
                        {c.rank}{c.suit}
                      </Text>
                    )}
                    {c.hidden && <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>♠</Text>}
                  </View>
                ))}
              </View>
              <View style={styles.oppStatus}>
                {opp.busted && <Text style={styles.oppStatusText}>爆牌</Text>}
                {opp.stood && <Text style={styles.oppStatusText}>停牌</Text>}
                {opp.blackjack && <Text style={[styles.oppStatusText, { color: '#8b5cf6' }]}>BJ!</Text>}
                {opp.result && <Text style={[styles.oppStatusText, { color: getResultColor(opp.result) }]}>{getResultText(opp.result)}</Text>}
                {opp.totalBet > 0 && <Text style={styles.oppBet}>下注:{opp.totalBet}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* 我的区域 */}
        <View style={styles.myArea}>
          <Hand cards={me?.cards || []} score={calcHand(me?.cards || [])} label="我" />
          {me?.result && (
            <Text style={[styles.resultText, { color: getResultColor(me.result) }]}>
              {getResultText(me.result)} {me.winAmount > 0 && `+${me.winAmount}`}
            </Text>
          )}
          {me?.totalBet > 0 && <Text style={styles.myBet}>下注: {me.totalBet}</Text>}
        </View>
      </ScrollView>

      {/* 底部操作 */}
      <View style={styles.controls}>
        {isBetting && <BettingControls gameState={gameState} playerId={playerId} />}
        {(isPlaying || isFinished || isDealerTurn) && <GameActions gameState={gameState} playerId={playerId} />}

        {/* 兜底显示：确保始终有操作按钮 */}
        {!isBetting && !isPlaying && !isFinished && !isDealerTurn && (
          <View style={styles.fallbackControls}>
            <Text style={styles.fallbackText}>游戏状态: {gameState.state || '未知'}</Text>
            <TouchableOpacity style={styles.fallbackBtn} onPress={backToLobby}>
              <Text style={styles.fallbackBtnText}>返回大厅</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f6f3',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f6f3',
  },
  loadingText: {
    color: '#a89f94',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e2d8',
    minHeight: 44, // 确保头部有固定高度
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 18,
    color: '#7a7068',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c2418',
    letterSpacing: 1,
  },
  modeText: {
    fontSize: 11,
    color: '#c4bf',
  },
  chips: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c4945c',
  },
  table: {
    flex: 1,
    maxHeight: 'calc(100vh - 180px)', // 确保为操作按钮留出足够空间
  },
  tableContent: {
    padding: 12,
    gap: 8,
    paddingBottom: 20,
  },
  dealerArea: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusArea: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#7a7068',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e2d8',
  },
  opponents: {
    gap: 10,
  },
  oppCard: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e2d8',
  },
  oppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  oppName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c2418',
  },
  oppChips: {
    fontSize: 11,
    color: '#c4945c',
  },
  oppCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  miniCard: {
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e2d8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  miniCardHidden: {
    backgroundColor: '#4a5568',
    borderWidth: 0,
  },
  miniCardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2c2418',
  },
  oppStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  oppStatusText: {
    fontSize: 11,
    color: '#7a7068',
    fontWeight: '500',
  },
  oppBet: {
    fontSize: 10,
    color: '#c4bf',
  },
  myArea: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
  },
  myBet: {
    fontSize: 12,
    color: '#a89f94',
  },
  controls: {
    flexShrink: 0,
  },
  fallbackControls: {
    padding: 20,
    backgroundColor: '#fff8e1',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e2d8',
  },
  fallbackText: {
    fontSize: 14,
    color: '#a89f94',
  },
  fallbackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#7a7068',
    borderRadius: 8,
  },
  fallbackBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default GameScreen;
