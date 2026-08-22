/**
 * 帽子21点 - 匹配等待页面 (自然风格)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const WaitingScreen = () => {
  const { cancelMatch, onlineCount, matchingCount } = useGameStore();
  const [dots, setDots] = useState('');

  // 动画效果
  useEffect(() => {
    const timer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* 扑克动画 */}
        <View style={styles.pokerRow}>
          <Text style={styles.pokerIcon}>♠</Text>
          <Text style={styles.pokerIcon}>♥</Text>
          <Text style={styles.pokerIcon}>♦</Text>
          <Text style={styles.pokerIcon}>♣</Text>
        </View>

        <Text style={styles.title}>正在匹配玩家中{dots}</Text>
        <Text style={styles.desc}>在线: {onlineCount}人 | 匹配中: {matchingCount}人</Text>

        <TouchableOpacity style={styles.cancelBtn} onPress={cancelMatch}>
          <Text style={styles.cancelText}>取消匹配</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f6f3',
  },
  content: {
    alignItems: 'center',
    gap: 24,
    padding: 40,
  },
  pokerRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  pokerIcon: {
    fontSize: 40,
    color: '#a89f94',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c2418',
    minWidth: 160,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    color: '#a89f94',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#c9584a',
    borderRadius: 8,
  },
  cancelText: {
    color: '#c9584a',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default WaitingScreen;
