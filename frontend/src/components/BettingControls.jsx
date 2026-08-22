/**
 * 帽子21点 - 下注控制组件 (React Native Web)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const BettingControls = ({ gameState, playerId }) => {
  const { placeBet } = useGameStore();
  const [customBet, setCustomBet] = useState(50);
  
  const player = gameState?.players?.find(p => p.id === playerId);
  const minBet = gameState?.minBet || 10;
  const maxBet = gameState?.maxBet || 500;
  
  if (!player) return null;

  const quickBets = [
    { label: String(minBet), value: minBet },
    { label: String(minBet * 5), value: minBet * 5 },
    { label: String(minBet * 10), value: minBet * 10 },
    { label: '梭哈', value: player.chips },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <Text style={styles.chips}>💰 {player.chips}</Text>
        <Text style={styles.currentBet}>当前下注: {player.totalBet}</Text>
      </View>
      
      <View style={styles.quickBets}>
        {quickBets.map((bet, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.quickBetBtn, (bet.value > player.chips || bet.value < minBet) && styles.disabledBtn]}
            onPress={() => placeBet(bet.value)}
            disabled={bet.value > player.chips || bet.value < minBet}
          >
            <Text style={styles.quickBetText}>{bet.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customBet}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>下注: </Text>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${(customBet / Math.min(maxBet, player.chips)) * 100}%` }]} />
          </View>
          <Text style={styles.customAmount}>{customBet}</Text>
        </View>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => placeBet(customBet)}
        >
          <Text style={styles.confirmBtnText}>确认下注</Text>
        </TouchableOpacity>
      </View>
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chips: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f39c12',
  },
  currentBet: {
    fontSize: 14,
    color: '#6c757d',
  },
  quickBets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickBetBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#e8fdf5',
    borderWidth: 2,
    borderColor: '#2ecc71',
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  quickBetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27ae60',
  },
  customBet: {
    gap: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#2ecc71',
    borderRadius: 3,
  },
  customAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    minWidth: 40,
    textAlign: 'right',
  },
  confirmBtn: {
    paddingVertical: 12,
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BettingControls;
