/**
 * 帽子21点 - 游戏大厅 (超浅色)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const LobbyScreen = () => {
  const { playerName, startPvE, startMatch, connected, onlineCount } = useGameStore();

  return (
    <View style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>♠</Text>
          </View>
          <View>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.playerChips}>💰 1000</Text>
          </View>
        </View>
        <View style={styles.statusArea}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#6b9b6a' : '#c9605a' }]} />
          <Text style={styles.statusText}>{onlineCount}人在线</Text>
        </View>
      </View>

      {/* 内容 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.label}>选择模式</Text>
        
        <TouchableOpacity style={styles.card} onPress={startPvE}>
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>🤖</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>人机对战</Text>
            <Text style={styles.cardDesc}>与AI即时对局</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={startMatch}>
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>⚔️</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>1V1 对战</Text>
            <Text style={styles.cardDesc}>匹配真人玩家</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>游戏规则</Text>
          <Text style={styles.ruleItem}>• 目标：接近21点，不超过</Text>
          <Text style={styles.ruleItem}>• A=1或11，J/Q/K=10</Text>
          <Text style={styles.ruleItem}>• 操作：下注/跟注/加注/梭哈</Text>
          <Text style={styles.ruleItem}>• Blackjack 1.5倍奖励</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7e2',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0ece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    color: '#8a8580',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a4540',
  },
  playerChips: {
    fontSize: 12,
    color: '#c4a06a',
    marginTop: 1,
  },
  statusArea: {
    alignItems: 'flex-end',
    gap: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#b8b3ad',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#f5f3f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
    fontSize: 20,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a4540',
  },
  cardDesc: {
    fontSize: 12,
    color: '#b8b3ad',
  },
  cardArrow: {
    fontSize: 16,
    color: '#d5d0ca',
  },
  rules: {
    marginTop: 10,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3f0eb',
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8580',
    marginBottom: 8,
  },
  ruleItem: {
    fontSize: 12,
    color: '#b8b3ad',
    lineHeight: 1.8,
  },
});

export default LobbyScreen;
