/**
 * 帽子21点 - 比赛页面
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const TournamentScreen = ({ onBack }) => {
  const { token, user } = useGameStore();
  const [tournaments, setTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTournaments();
    fetchLeaderboard();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // 每秒更新倒计时
    timerRef.current = setInterval(() => {
      setTournaments((prev) =>
        prev.map((t) => ({
          ...t,
          timeLeft: Math.max(0, t.timeLeft - 1)
        }))
      );
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [tournaments.length]);

  const fetchTournaments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/tournament/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        const list = (data.tournaments || []).map((t) => ({
          ...t,
          timeLeft: t.startTime
            ? Math.max(0, Math.floor((new Date(t.startTime).getTime() - Date.now()) / 1000))
            : t.duration || 0
        }));
        setTournaments(list);

        // 记录已报名的比赛
        const registered = new Set(
          list.filter((t) => t.isRegistered).map((t) => t.id)
        );
        setRegisteredIds(registered);
      } else {
        setError(data.error || '获取比赛列表失败');
      }
    } catch (err) {
      console.error('获取比赛列表失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    // 比赛排行榜暂不使用
    // try {
    //   const response = await fetch('/api/tournament/leaderboard?limit=20', {
    //     headers: { 'Authorization': `Bearer ${token}` }
    //   });
    //   const data = await response.json();
    //   if (response.ok) {
    //     setLeaderboard(data.leaderboard || []);
    //   }
    // } catch (err) {
    //   console.error('获取排行榜失败:', err);
    // }
  };

  const handleJoin = async (tournamentId) => {
    setJoining(true);
    setError('');
    try {
      const response = await fetch('/api/tournament/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tournamentId })
      });
      const data = await response.json();
      if (response.ok) {
        setRegisteredIds((prev) => new Set([...prev, tournamentId]));
        // 更新参赛人数
        setTournaments((prev) =>
          prev.map((t) =>
            t.id === tournamentId
              ? { ...t, participants: (t.participants || 0) + 1, isRegistered: true }
              : t
          )
        );
      } else {
        setError(data.error || '报名失败');
      }
    } catch (err) {
      console.error('报名失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setJoining(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return '已开始';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#6b9b6a';
      case 'upcoming': return '#c4945c';
      case 'ended': return '#b8b3ad';
      default: return '#8a8580';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '进行中';
      case 'upcoming': return '即将开始';
      case 'ended': return '已结束';
      default: return '未知';
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>锦标赛</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTournaments}>
          <Text style={styles.refreshBtnText}>刷新</Text>
        </TouchableOpacity>
      </View>

      {/* 错误提示 */}
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* 当前比赛列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>比赛列表</Text>
          {loading ? (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>加载比赛中...</Text>
            </View>
          ) : tournaments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>暂无比赛</Text>
            </View>
          ) : (
            <View style={styles.tournamentList}>
              {tournaments.map((tournament) => {
                const isRegistered = registeredIds.has(tournament.id);
                const canJoin = tournament.status !== 'ended' && !isRegistered && tournament.timeLeft > 0;
                const isFull = tournament.maxParticipants && tournament.participants >= tournament.maxParticipants;

                return (
                  <View key={tournament.id} style={styles.tournamentCard}>
                    <View style={styles.tournamentHeader}>
                      <Text style={styles.tournamentName}>{tournament.name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(tournament.status) }]}>
                          {getStatusText(tournament.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.tournamentDesc}>{tournament.description}</Text>

                    <View style={styles.tournamentMeta}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>⏱️</Text>
                        <Text style={[
                          styles.metaText,
                          tournament.timeLeft <= 60 && tournament.timeLeft > 0 && styles.urgentText
                        ]}>
                          {formatTime(tournament.timeLeft)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>👥</Text>
                        <Text style={styles.metaText}>
                          {tournament.participants || 0}/{tournament.maxParticipants || '∞'}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>💰</Text>
                        <Text style={styles.metaText}>{tournament.prize || 0}</Text>
                      </View>
                    </View>

                    <View style={styles.tournamentFooter}>
                      <Text style={styles.entryFee}>
                        报名费: 💰 {tournament.entryFee || 0}
                      </Text>
                      {isRegistered ? (
                        <View style={styles.joinedBadge}>
                          <Text style={styles.joinedText}>已报名</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.joinBtn,
                            (!canJoin || isFull || joining) && styles.joinBtnDisabled
                          ]}
                          onPress={() => handleJoin(tournament.id)}
                          disabled={!canJoin || isFull || joining}
                        >
                          <Text style={[
                            styles.joinBtnText,
                            (!canJoin || isFull || joining) && styles.joinBtnTextDisabled
                          ]}>
                            {isFull ? '已满' : '报名'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 排行榜 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>排行榜</Text>
          {leaderboard.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>暂无排行数据</Text>
            </View>
          ) : (
            <View style={styles.leaderboardList}>
              {leaderboard.map((item, index) => (
                <View key={item.id || index} style={styles.leaderItem}>
                  <View style={[
                    styles.rankBadge,
                    index === 0 && styles.rankFirst,
                    index === 1 && styles.rankSecond,
                    index === 2 && styles.rankThird,
                    index > 2 && styles.rankNormal
                  ]}>
                    <Text style={styles.rankText}>{getRankIcon(index + 1)}</Text>
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderName}>{item.username}</Text>
                    <Text style={styles.leaderScore}>积分: {item.score || 0}</Text>
                  </View>
                  <View style={styles.leaderPrize}>
                    <Text style={styles.leaderPrizeText}>💰 {item.prize || 0}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 比赛规则 */}
        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>比赛规则</Text>
          <Text style={styles.rulesText}>• 比赛开始时自动匹配对手</Text>
          <Text style={styles.rulesText}>• 采用淘汰制，单局定胜负</Text>
          <Text style={styles.rulesText}>• 冠军获得奖池全部筹码</Text>
          <Text style={styles.rulesText}>• 报名费不予退还</Text>
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
  refreshBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#f0ece6',
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#8a8580',
    fontWeight: '500',
  },
  errorBar: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
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
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8a8580',
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#b8b3ad',
    fontSize: 14,
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
  tournamentList: {
    gap: 10,
  },
  tournamentCard: {
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ebe7e2',
    gap: 8,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tournamentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a4540',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tournamentDesc: {
    fontSize: 12,
    color: '#8a8580',
    lineHeight: 1.4,
  },
  tournamentMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#4a4540',
    fontWeight: '500',
  },
  urgentText: {
    color: '#c9605a',
    fontWeight: '600',
  },
  tournamentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f3f0eb',
  },
  entryFee: {
    fontSize: 12,
    color: '#c4945c',
    fontWeight: '500',
  },
  joinBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#6b9b6a',
    borderRadius: 8,
  },
  joinBtnDisabled: {
    backgroundColor: '#ebe7e2',
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  joinBtnTextDisabled: {
    color: '#b8b3ad',
  },
  joinedBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0ece6',
    borderRadius: 8,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b9b6a',
  },
  leaderboardList: {
    gap: 6,
  },
  leaderItem: {
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#4a4540',
  },
  leaderInfo: {
    flex: 1,
    gap: 2,
  },
  leaderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a4540',
  },
  leaderScore: {
    fontSize: 11,
    color: '#b8b3ad',
  },
  leaderPrize: {
    alignItems: 'flex-end',
  },
  leaderPrizeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c4945c',
  },
  rules: {
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3f0eb',
    gap: 6,
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8580',
    marginBottom: 4,
  },
  rulesText: {
    fontSize: 11,
    color: '#b8b3ad',
    lineHeight: 1.6,
  },
});

export default TournamentScreen;
