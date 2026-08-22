/**
 * 帽子21点 - 扑克牌组件 (React Native Web)
 */

import React from 'react';
import { View, Text, StyleSheet } from '../rnw';

const Card = ({ card, index = 0 }) => {
  if (!card || card.hidden) {
    return (
      <View style={styles.cardHidden}>
        <Text style={styles.hiddenIcon}>🎩</Text>
      </View>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';
  
  return (
    <View style={styles.card}>
      <View style={styles.cornerTop}>
        <Text style={[styles.cornerText, isRed && styles.red]}>{card.rank}</Text>
        <Text style={[styles.cornerSuit, isRed && styles.red]}>{card.suit}</Text>
      </View>
      <Text style={[styles.rank, isRed && styles.red]}>{card.rank}</Text>
      <Text style={[styles.suit, isRed && styles.red]}>{card.suit}</Text>
      <View style={styles.cornerBottom}>
        <Text style={[styles.cornerText, isRed && styles.red]}>{card.rank}</Text>
        <Text style={[styles.cornerSuit, isRed && styles.red]}>{card.suit}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 84,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  cardHidden: {
    width: 60,
    height: 84,
    borderRadius: 8,
    backgroundColor: '#2c3e50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  hiddenIcon: {
    fontSize: 28,
  },
  cornerTop: {
    position: 'absolute',
    top: 4,
    left: 6,
    alignItems: 'center',
  },
  cornerBottom: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  cornerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 14,
  },
  cornerSuit: {
    fontSize: 11,
    color: '#1a1a2e',
    lineHeight: 14,
  },
  rank: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    lineHeight: 24,
  },
  suit: {
    fontSize: 24,
    color: '#1a1a2e',
    lineHeight: 28,
    marginTop: 2,
  },
  red: {
    color: '#e74c3c',
  },
});

export default Card;
