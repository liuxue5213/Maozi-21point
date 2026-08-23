/**
 * 帽子21点 - 下注控制 (自然风格)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const BettingControls = ({ gameState, playerId }) => {
  const { placeBet } = useGameStore();
  const [amount, setAmount] = useState(50);
  
  const player = gameState?.players?.find(p => p.id === playerId);
  const minBet = gameState?.minBet || 10;
  const maxBet = gameState?.maxBet || 500;
  
  if (!player) return null;

  const quickBets = [minBet, minBet * 5, minBet * 10, player.chips];
  const labels = ['最小', '5x', '10x', '梭哈'];

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <Text style={styles.chips}>💰 {player.chips}</Text>
        <Text style={styles.bet}>已下注: {player.totalBet}</Text>
      </View>
      
      <View style={styles.quickRow}>
        {quickBets.map((val, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.quickBtn, val > player.chips && styles.disabled]}
            onPress={() => placeBet(val)}
            disabled={val > player.chips || val < minBet}
          >
            <Text style={styles.quickLabel}>{labels[i]}</Text>
            <Text style={styles.quickVal}>{val > player.chips ? '-' : val}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customRow}>
        <View style={styles.amountBox}>
          <TouchableOpacity onPress={() => setAmount(Math.max(minBet, amount - 10))}>
            <Text style={styles.adjustBtn}>−</Text>
          </TouchableOpacity>
          <Text style={styles.amountText}>{amount}</Text>
          <TouchableOpacity onPress={() => setAmount(Math.min(player.chips, amount + 10))}>
            <Text style={styles.adjustBtn}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.confirmBtn} onPress={() => placeBet(amount)}>
          <Text style={styles.confirmText}>下注</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e8e2d8',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chips: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c4945c',
  },
  bet: {
    fontSize: 13,
    color: '#a89f94',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f5f3f0',
    borderRadius: 8,
    alignItems: 'center',
    gap: 2,
  },
  disabled: {
    opacity: 0.4,
  },
  quickLabel: {
    fontSize: 10,
    color: '#a89f94',
  },
  quickVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c2418',
  },
  customRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  amountBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f3f0',
    borderRadius: 8,
  },
  adjustBtn: {
    fontSize: 20,
    color: '#7a7068',
    paddingHorizontal: 4,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c2418',
  },
  confirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#5b8c5a',
    borderRadius: 8,
  },
  confirmText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default BettingControls;
