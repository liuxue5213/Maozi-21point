/**
 * 帽子21点 - 个人中心页面
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const ProfileScreen = ({ onBack }) => {
  const { token, user } = useGameStore();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchHistory();
    fetchAchievements();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('获取个人资料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/users/profile/history?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('获取游戏历史失败:', error);
    }
  };

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/users/achievements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error('获取成就失败:', error);
    }
  };

  const getResultColor = (result) => {
    if (result === 'win') return '#6b9b6a';
    if (result === 'lose') return '#c9605a';
    return '#b8b3ad';
  };

  const getResultText = (result) => {
    if (result === 'win') return '胜利';
    if (result === 'lose') return '失败';
    return '平局';
  };

  const stats = profile?.stats || {};
  const winRate = stats.gamesPlayed > 0
    ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1)
    : '0.0';

  return (
    <View style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>个人中心</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {loading ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : (
          <>
            {/* 用户信息卡片 */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.username ? profile.username[0].toUpperCase() : '♠'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.username}>{profile?.username || user?.username || '玩家'}</Text>
                <Text style={styles.userLevel}>Lv.{profile?.level || 1}</Text>
                <View style={styles.expBar}>
                  <View
                    style={[
                      styles.expFill,
                      { width: `${Math.min((profile?.exp || 0) % 100, 100)}%` }
                    ]}
                  />
                </View>
                <Text style={styles.expText}>经验 {profile?.exp || 0} / {((profile?.level || 1) * 100)}</Text>
              </View>
            </View>

            {/* 统计数据 */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>游戏统计</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.gamesPlayed || 0}</Text>
                  <Text style={styles.statLabel}>总局数</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#6b9b6a' }]}>{stats.gamesWon || 0}</Text>
                  <Text style={styles.statLabel}>胜场</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#c9605a' }]}>{stats.gamesLost || 0}</Text>
                  <Text style={styles.statLabel}>负场</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.gamesDraw || 0}</Text>
                  <Text style={styles.statLabel}>平局</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#c4945c' }]}>{winRate}%</Text>
                  <Text style={styles.statLabel}>胜率</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#c4a06a' }]}>
                    💰 {stats.totalChipsWon || 0}
                  </Text>
                  <Text style={styles.statLabel}>赢取筹码</Text>
                </View>
              </View>
            </View>

            {/* 最近游戏记录 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>最近游戏</Text>
              {history.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>暂无游戏记录</Text>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {history.map((game, index) => (
                    <View key={game.id || index} style={styles.historyItem}>
                      <View style={styles.historyLeft}>
                        <Text style={styles.historyMode}>
                          {game.mode === 'pve' ? '🤖 人机' : '⚔️ 对战'}
                        </Text>
                        <Text style={styles.historyDate}>{game.date || ''}</Text>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={[styles.historyResult, { color: getResultColor(game.result) }]}>
                          {getResultText(game.result)}
                        </Text>
                        <Text style={styles.historyChips}>
                          {game.result === 'win' ? '+' : ''}{game.chipsChange || 0}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 成就展示 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>已解锁成就</Text>
              {achievements.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>暂无已解锁成就</Text>
                </View>
              ) : (
                <View style={styles.achievementsList}>
                  {achievements.map((achievement, index) => (
                    <View key={achievement.id || index} style={styles.achievementItem}>
                      <Text style={styles.achievementIcon}>{achievement.icon || '🏅'}</Text>
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementName}>{achievement.name}</Text>
                        <Text style={styles.achievementDesc}>{achievement.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 操作按钮 */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn}>
                <Text style={styles.editBtnText}>编辑资料</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backLobbyBtn} onPress={onBack}>
                <Text style={styles.backLobbyBtnText}>返回大厅</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7e2',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backBtnText: {
    fontSize: 20,
    color: '#7a7068',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a4540',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    gap: 16,
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#b8b3ad',
    fontSize: 14,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f0ece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#8a8580',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4a4540',
  },
  userLevel: {
    fontSize: 12,
    color: '#c4945c',
    fontWeight: '500',
  },
  expBar: {
    height: 4,
    backgroundColor: '#f0ece6',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  expFill: {
    height: '100%',
    backgroundColor: '#6b9b6a',
    borderRadius: 2,
  },
  expText: {
    fontSize: 10,
    color: '#b8b3ad',
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  statsSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8a8580',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '31%',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a4540',
  },
  statLabel: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  emptyCard: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
    alignItems: 'center',
  },
  emptyText: {
    color: '#b8b3ad',
    fontSize: 13,
  },
  historyList: {
    gap: 6,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  historyLeft: {
    gap: 2,
  },
  historyMode: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4a4540',
  },
  historyDate: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  historyResult: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyChips: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  achievementsList: {
    gap: 6,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
    gap: 2,
  },
  achievementName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a4540',
  },
  achievementDesc: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8a8580',
  },
  backLobbyBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#6b9b6a',
    borderRadius: 8,
    alignItems: 'center',
  },
  backLobbyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default ProfileScreen;
