/**
 * 帽子21点 - 游戏大厅 (超浅色)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const LobbyScreen = () => {
  const { playerName, user, startPvE, startMatch, connected, onlineCount, error, clearError, logout, setScreen } = useGameStore();

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 3000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handlePvE = () => {
    if (!connected) {
      return;
    }
    startPvE();
  };

  const handleMatch = () => {
    if (!connected) {
      return;
    }
    startMatch();
  };

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
            <Text style={styles.playerChips}>💰 {user?.chips || 1000}</Text>
          </View>
        </View>
        <View style={styles.statusArea}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#6b9b6a' : '#c9605a' }]} />
          <Text style={styles.statusText}>{connected ? `${onlineCount}人在线` : '连接中...'}</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>登出</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 错误提示 */}
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* 内容 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.label}>选择模式</Text>

        <TouchableOpacity
          style={[styles.card, !connected && styles.cardDisabled]}
          onPress={handlePvE}
          disabled={!connected}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>🤖</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>人机对战</Text>
            <Text style={styles.cardDesc}>{connected ? '与AI即时对局' : '等待连接...'}</Text>
          </View>
          <Text style={[styles.cardArrow, !connected && styles.arrowDisabled]}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, !connected && styles.cardDisabled]}
          onPress={handleMatch}
          disabled={!connected}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>⚔️</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>1V1 对战</Text>
            <Text style={styles.cardDesc}>{connected ? '匹配真人玩家' : '等待连接...'}</Text>
          </View>
          <Text style={[styles.cardArrow, !connected && styles.arrowDisabled]}>→</Text>
        </TouchableOpacity>

        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>游戏规则</Text>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>• 目标：接近21点，不超过</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>• A=1或11，J/Q/K=10</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>• 操作：要牌/停牌/加倍</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>• Blackjack 1.5倍奖励</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.leaderboardBtn} onPress={() => setScreen('leaderboard')}>
          <Text style={styles.leaderboardBtnText}>🏆 排行榜</Text>
        </TouchableOpacity>
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
  logoutBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0ece6',
    borderRadius: 4,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 10,
    color: '#8a8580',
  },
  errorBar: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    fontSize: 12,
    textAlign: 'center',
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
  cardDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f3f0',
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
  arrowDisabled: {
    opacity: 0.3,
  },
  rules: {
    marginTop: 10,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3f0eb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8580',
    marginBottom: 8,
  },
  ruleItem: {
    display: 'block',
    width: '100%',
  },
  ruleText: {
    fontSize: 12,
    color: '#8a8580',
    lineHeight: 1.8,
  },
  leaderboardBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#c4945c',
    borderRadius: 8,
    alignItems: 'center',
  },
  leaderboardBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LobbyScreen;