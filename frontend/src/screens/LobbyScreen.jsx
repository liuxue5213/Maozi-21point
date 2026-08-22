/**
 * 帽子21点 - 游戏大厅 (React Native Web)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const LobbyScreen = () => {
  const { playerName, startPvE, startMatch, connected } = useGameStore();

  return (
    <View style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🎩</Text>
          </View>
          <View>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.playerChips}>💰 1000 金币</Text>
          </View>
        </View>
        <View style={[styles.status, { backgroundColor: connected ? '#d4edda' : '#f8d7da' }]}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#2ecc71' : '#e74c3c' }]} />
          <Text style={styles.statusText}>{connected ? '在线' : '离线'}</Text>
        </View>
      </View>

      {/* 主内容 */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>选择游戏模式</Text>
        
        {/* 人机对战卡片 */}
        <TouchableOpacity style={styles.modeCard} onPress={startPvE}>
          <Text style={styles.modeIcon}>🤖</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>人机对战</Text>
            <Text style={styles.modeDesc}>与AI机器人一决高下</Text>
          </View>
          <Text style={styles.modeArrow}>→</Text>
        </TouchableOpacity>

        {/* 1V1匹配卡片 */}
        <TouchableOpacity style={[styles.modeCard, styles.pvpCard]} onPress={startMatch}>
          <Text style={styles.modeIcon}>⚔️</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>1V1 匹配对战</Text>
            <Text style={styles.modeDesc}>实时匹配真人玩家对战</Text>
          </View>
          <Text style={styles.modeArrow}>→</Text>
        </TouchableOpacity>

        {/* 游戏说明 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🎮 游戏规则</Text>
          <Text style={styles.infoText}>• 每位玩家起始 1000 金币</Text>
          <Text style={styles.infoText}>• 目标：手牌点数接近21点，但不能超过</Text>
          <Text style={styles.infoText}>• J/Q/K = 10点，A = 1或11点</Text>
          <Text style={styles.infoText}>• 支持：下注、跟注、加注、梭哈</Text>
          <Text style={styles.infoText}>• Blackjack（首两张21点）1.5倍奖励</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  playerChips: {
    fontSize: 13,
    color: '#f39c12',
    fontWeight: '500',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#d4edda',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  pvpCard: {
    backgroundColor: '#f3e5ff',
  },
  modeIcon: {
    fontSize: 40,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  modeDesc: {
    fontSize: 13,
    color: '#6c757d',
  },
  modeArrow: {
    fontSize: 24,
    color: '#6c757d',
  },
  infoCard: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 'auto',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 2,
  },
});

export default LobbyScreen;
