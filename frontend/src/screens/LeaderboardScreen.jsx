/**
 * 帽子21点 - 排行榜页面
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const LeaderboardScreen = ({ onBack }) => {
  const { token } = useGameStore();
  const [activeTab, setActiveTab] = useState('chips');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { key: 'chips', label: '筹码榜', icon: '💰' },
    { key: 'wins', label: '胜场榜', icon: '🏆' },
    { key: 'winRate', label: '胜率榜', icon: '📊' },
  ];

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/leaderboard?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      let sorted = [...data.leaderboard];

      if (activeTab === 'chips') {
        sorted.sort((a, b) => b.chips - a.chips);
      } else if (activeTab === 'wins') {
        sorted.sort((a, b) => b.gamesWon - a.gamesWon);
      } else if (activeTab === 'winRate') {
        sorted.sort((a, b) => {
          const rateA = a.gamesPlayed > 0 ? (a.gamesWon / a.gamesPlayed) : 0;
          const rateB = b.gamesPlayed > 0 ? (b.gamesWon / b.gamesPlayed) : 0;
          return rateB - rateA;
        });
      }

      setLeaderboard(sorted.map((item, index) => ({
        ...item,
        rank: index + 1,
        winRate: item.gamesPlayed > 0 ? ((item.gamesWon / item.gamesPlayed) * 100).toFixed(1) : '0.0'
      })));
    } catch (error) {
      console.error('获取排行榜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return styles.rankFirst;
    if (rank === 2) return styles.rankSecond;
    if (rank === 3) return styles.rankThird;
    return styles.rankNormal;
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <View style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>排行榜</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 标签切换 */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 排行榜列表 */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无数据</Text>
          </View>
        ) : (
          leaderboard.map((item) => (
            <View key={item.id} style={styles.rankItem}>
              <View style={[styles.rankBadge, getRankStyle(item.rank)]}>
                <Text style={styles.rankText}>{getRankIcon(item.rank)}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.username}</Text>
                <Text style={styles.playerLevel}>Lv.{item.level || 1}</Text>
              </View>
              <View style={styles.stats}>
                {activeTab === 'chips' && (
                  <Text style={styles.statValue}>💰 {item.chips}</Text>
                )}
                {activeTab === 'wins' && (
                  <Text style={styles.statValue}>🏆 {item.gamesWon || 0}</Text>
                )}
                {activeTab === 'winRate' && (
                  <Text style={styles.statValue}>📊 {item.winRate}%</Text>
                )}
              </View>
            </View>
          ))
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7e2',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6b9b6a',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 12,
    color: '#b8b3ad',
  },
  tabTextActive: {
    color: '#6b9b6a',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#b8b3ad',
    fontSize: 14,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#b8b3ad',
    fontSize: 14,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankFirst: {
    backgroundColor: '#ffd700',
  },
  rankSecond: {
    backgroundColor: '#c0c0c0',
  },
  rankThird: {
    backgroundColor: '#cd7f32',
  },
  rankNormal: {
    backgroundColor: '#f0ece6',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4540',
  },
  playerInfo: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4540',
  },
  playerLevel: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  stats: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c4945c',
  },
});

export default LeaderboardScreen;
