/**
 * 帽子21点 - 游戏操作组件 (React Native Web)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const GameActions = ({ gameState, playerId }) => {
  const { hit, stand, doubleDown, nextRound } = useGameStore();
  
  const player = gameState?.players?.find(p => p.id === playerId);
  const isMyTurn = gameState?.currentTurn === playerId;
  const canDouble = player?.cards?.length === 2 && player?.chips >= player?.bet;
  
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
  
  // 游戏结束 - 显示下一轮
  if (gameState?.state === 'finished') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.nextBtn} onPress={nextRound}>
          <Text style={styles.nextBtnText}>🔄 下一轮</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 不是我的回合
  if (!isMyTurn || !player) {
    return (
      <View style={styles.container}>
        <View style={styles.waiting}>
          <View style={styles.waitingDot} />
          <Text style={styles.waitingText}>等待其他玩家...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.hitBtn} onPress={hit}>
          <Text style={styles.actionIcon}>🎯</Text>
          <Text style={styles.actionText}>要牌</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.standBtn} onPress={stand}>
          <Text style={styles.actionIcon}>✋</Text>
          <Text style={styles.actionText}>停牌</Text>
        </TouchableOpacity>
        
        {canDouble && (
          <TouchableOpacity style={styles.doubleBtn} onPress={doubleDown}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionText}>加倍</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.hint}>当前点数: {calcHand(player.cards)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  hitBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  standBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  doubleBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f39c12',
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6c757d',
    marginTop: 8,
  },
  nextBtn: {
    paddingVertical: 16,
    backgroundColor: '#3498db',
    borderRadius: 12,
    alignItems: 'center',
  },
  nextBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  waitingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f39c12',
  },
  waitingText: {
    color: '#6c757d',
    fontSize: 14,
  },
});

export default GameActions;
