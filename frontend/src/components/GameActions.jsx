/**
 * 帽子21点 - 游戏操作 (自然风格)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const GameActions = ({ gameState, playerId }) => {
  const { hit, stand, doubleDown, nextRound } = useGameStore();
  
  const player = gameState?.players?.find(p => p.id === playerId);
  const isMyTurn = gameState?.currentTurn === playerId;
  const canDouble = player?.cards?.length === 2 && player?.chips >= player?.bet;
  
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
  
  if (gameState?.state === 'finished') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.nextBtn} onPress={nextRound}>
          <Text style={styles.nextText}>下一轮</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isMyTurn || !player) {
    return (
      <View style={styles.container}>
        <Text style={styles.waiting}>等待中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.hitBtn} onPress={hit}>
          <Text style={styles.btnText}>要牌</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.standBtn} onPress={stand}>
          <Text style={styles.btnText}>停牌</Text>
        </TouchableOpacity>
        
        {canDouble && (
          <TouchableOpacity style={styles.doubleBtn} onPress={doubleDown}>
            <Text style={styles.btnText}>加倍</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.hint}>点数: {calcHand(player.cards)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e8e2d8',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  hitBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#5b8c5a',
    borderRadius: 8,
    alignItems: 'center',
  },
  standBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#c9584a',
    borderRadius: 8,
    alignItems: 'center',
  },
  doubleBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#c4945c',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#a89f94',
  },
  nextBtn: {
    paddingVertical: 14,
    backgroundColor: '#5a7d9a',
    borderRadius: 8,
    alignItems: 'center',
  },
  nextText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  waiting: {
    textAlign: 'center',
    color: '#a89f94',
    fontSize: 14,
    paddingVertical: 8,
  },
});

export default GameActions;
