/**
 * 帽子21点 - 匹配等待页面 (React Native Web)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const WaitingScreen = () => {
  const { cancelMatch } = useGameStore();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* 动画区域 */}
        <View style={styles.animationArea}>
          <Text style={styles.pokerIcon}>♠ ♥ ♦ ♣</Text>
          <View style={styles.loaderRow}>
            <View style={[styles.loaderDot, { animationDelay: '0s' }]} />
            <View style={[styles.loaderDot, { animationDelay: '0.2s' }]} />
            <View style={[styles.loaderDot, { animationDelay: '0.4s' }]} />
          </View>
        </View>

        <Text style={styles.title}>正在寻找对手...</Text>
        <Text style={styles.desc}>请稍候，系统正在为您匹配玩家</Text>

        <TouchableOpacity style={styles.cancelBtn} onPress={cancelMatch}>
          <Text style={styles.cancelBtnText}>取消匹配</Text>
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
    backgroundColor: '#f8f9fa',
  },
  content: {
    alignItems: 'center',
    gap: 24,
    padding: 40,
  },
  animationArea: {
    alignItems: 'center',
    gap: 32,
  },
  pokerIcon: {
    fontSize: 48,
    letterSpacing: 8,
  },
  loaderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loaderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2ecc71',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  desc: {
    fontSize: 14,
    color: '#6c757d',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderRadius: 12,
  },
  cancelBtnText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WaitingScreen;
