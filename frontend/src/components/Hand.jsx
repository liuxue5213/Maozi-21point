/**
 * 帽子21点 - 手牌组件 (React Native Web)
 */

import React from 'react';
import { View, Text, StyleSheet } from '../rnw';
import Card from './Card';

const Hand = ({ cards = [], score, label }) => {
  const displayScore = score;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.score}>{displayScore}</Text>
        </View>
      </View>
      <View style={styles.cards}>
        {cards.map((card, index) => (
          <View key={index} style={[styles.cardWrapper, index > 0 && { marginLeft: -20 }]}>
            <Card card={card} index={index} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  scoreBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  score: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  cards: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cardWrapper: {
    zIndex: 1,
  },
});

export default Hand;
