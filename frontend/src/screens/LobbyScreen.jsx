/**
 * 帽子21点 - 游戏大厅 (自然风格)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const LobbyScreen = () => {
  const { playerName, startPvE, startMatch, connected } = useGameStore();

  return (
    <View style={styles.container}>
      {/* 顶部栏 */}
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
        <View style={[styles.statusDot, { backgroundColor: connected ? '#5b8c5a' : '#c9584a' }]} />
      </View>

      {/* 主内容 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.label}>选择模式</Text>
        
        {/* 人机对战 */}
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

        {/* 1V1匹配 */}
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

        {/* 规则 */}
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
    backgroundColor: '#f5f3f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e2d8',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2c2418',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    color: '#f5f3f0',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c2418',
  },
  playerChips: {
    fontSize: 12,
    color: '#c4945c',
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    gap: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#a89f94',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e2d8',
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f5f3f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
    fontSize: 22,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c2418',
  },
  cardDesc: {
    fontSize: 13,
    color: '#a89f94',
  },
  cardArrow: {
    fontSize: 18,
    color: '#d0c8bc',
  },
  rules: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#faf9f7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0ebe4',
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a7068',
    marginBottom: 10,
  },
  ruleItem: {
    fontSize: 13,
    color: '#a89f94',
    lineHeight: 1.9,
  },
});

export default LobbyScreen;
