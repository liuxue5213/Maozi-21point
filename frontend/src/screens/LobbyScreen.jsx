/**
 * 帽子21点 - 游戏大厅 (超浅色)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const LobbyScreen = () => {
  const { playerName, user, startPvE, startMatch, connected, onlineCount, error, clearError, logout, setScreen } = useGameStore();

  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;

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
          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.playerChips}>💰 {user?.chips || 1000}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.checkinBtnSmall} onPress={() => setScreen('checkin')}>
            <Text style={styles.checkinIconSmall}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>退出</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 状态栏 */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#6b9b6a' : '#c9605a' }]} />
        <Text style={styles.statusText}>{connected ? `${onlineCount}人在线` : '连接中...'}</Text>
      </View>

      {/* 错误提示 */}
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* 内容 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* 快捷功能按钮 - 在模式选择上方 */}
        <View style={styles.topQuickNav}>
          <TouchableOpacity style={styles.topQuickBtn} onPress={() => setScreen('checkin')}>
            <Text style={styles.topQuickIcon}>📅</Text>
            <Text style={styles.topQuickText}>签到</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topQuickBtn} onPress={() => setScreen('leaderboard')}>
            <Text style={styles.topQuickIcon}>🏆</Text>
            <Text style={styles.topQuickText}>排行</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topQuickBtn} onPress={() => setScreen('profile')}>
            <Text style={styles.topQuickIcon}>👤</Text>
            <Text style={styles.topQuickText}>个人</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topQuickBtn} onPress={() => setScreen('more')}>
            <Text style={styles.topQuickIcon}>⋯</Text>
            <Text style={styles.topQuickText}>更多</Text>
          </TouchableOpacity>
        </View>

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

        {/* 底部留白 */}
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
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7e2',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0ece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    color: '#8a8580',
  },
  playerDetails: {
    gap: 2,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a4540',
  },
  playerChips: {
    fontSize: 13,
    color: '#c4945c',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkinBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0ece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinIconSmall: {
    fontSize: 18,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0ece6',
    borderRadius: 8,
  },
  logoutBtnText: {
    fontSize: 11,
    color: '#8a8580',
    fontWeight: '500',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f0eb',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
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
  topQuickNav: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  topQuickBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  topQuickIcon: {
    fontSize: 18,
  },
  topQuickText: {
    fontSize: 10,
    color: '#7a7068',
    fontWeight: '500',
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
  quickNav: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickNavBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ebe7e2',
    alignItems: 'center',
    gap: 4,
    minHeight: 60,
  },
  quickNavIcon: {
    fontSize: 18,
  },
  quickNavText: {
    fontSize: 11,
    color: '#7a7068',
    fontWeight: '500',
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