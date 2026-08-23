import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from '../rnw';
import useGameStore from '../store/gameStore';

const AdminScreen = ({ onBack }) => {
  const { token } = useGameStore();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { if (tab === 'users') fetchUsers(); if (tab === 'stats') fetchStats(); }, [tab, page]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&search=${search}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats/overview', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
  };

  const handleBan = async (id, action) => {
    if (!confirm(action === 'ban' ? '确定封禁?' : '确定解封?')) return;
    try {
      await fetch(`/api/admin/users/${id}/${action}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (e) { window.alert('操作失败'); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>管理后台</Text><View style={{width:40}} />
      </View>
      <View style={s.tabs}>
        {['users','stats'].map(t=>(
          <TouchableOpacity key={t} style={[s.tab,tab===t&&s.tabActive]} onPress={()=>setTab(t)}>
            <Text style={[s.tabText,tab===t&&s.tabTextActive]}>{t==='users'?'用户管理':'数据统计'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {tab === 'users' && (
          <>
            <TextInput style={s.search} placeholder="搜索用户名" value={search} onChangeText={v=>{setSearch(v);setPage(1)}} />
            {users.map(u=>(
              <View key={u.id} style={s.userItem}>
                <View style={s.userInfo}>
                  <Text style={s.userName}>{u.username} {u.status==='banned'&&'(已封禁)'}</Text>
                  <Text style={s.userStats}>💰{u.chips} | {u.games_played}局 | Lv.{u.level||1}</Text>
                </View>
                <View style={s.userActions}>
                  <TouchableOpacity style={s.actionBtn} onPress={()=>handleBan(u.id,u.status==='banned'?'unban':'ban')}>
                    <Text style={s.actionText}>{u.status==='banned'?'解封':'封禁'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
        {tab === 'stats' && stats && (
          <View style={s.statsGrid}>
            <View style={s.statCard}><Text style={s.statValue}>{stats.totalUsers}</Text><Text style={s.statLabel}>总用户</Text></View>
            <View style={s.statCard}><Text style={s.statValue}>{stats.onlineUsers}</Text><Text style={s.statLabel}>在线</Text></View>
            <View style={s.statCard}><Text style={s.statValue}>{stats.todayRegistered}</Text><Text style={s.statLabel}>今日注册</Text></View>
            <View style={s.statCard}><Text style={s.statValue}>{stats.totalGames}</Text><Text style={s.statLabel}>总局数</Text></View>
            <View style={s.statCard}><Text style={s.statValue}>{stats.totalChips}</Text><Text style={s.statLabel}>总筹码</Text></View>
            <View style={s.statCard}><Text style={s.statValue}>{stats.activeUsers}</Text><Text style={s.statLabel}>活跃用户</Text></View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6},backText:{fontSize:20,color:'#7a7068'},title:{fontSize:16,fontWeight:'600',color:'#4a4540'},
  tabs:{flexDirection:'row',backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  tab:{flex:1,paddingVertical:12,alignItems:'center'},tabActive:{borderBottomWidth:2,borderBottomColor:'#6b9b6a'},
  tabText:{fontSize:13,color:'#b8b3ad'},tabTextActive:{color:'#6b9b6a',fontWeight:'600'},
  content:{flex:1},contentInner:{padding:16,gap:12},
  search:{padding:12,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#ebe7e2',fontSize:14,color:'#4a4540',marginBottom:8},
  userItem:{flexDirection:'row',padding:12,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#ebe7e2',alignItems:'center'},
  userInfo:{flex:1},userName:{fontSize:14,fontWeight:'600',color:'#4a4540'},userStats:{fontSize:11,color:'#b8b3ad',marginTop:2},
  userActions:{flexDirection:'row',gap:8},actionBtn:{paddingVertical:6,paddingHorizontal:12,borderRadius:6,backgroundColor:'#c9584a'},
  actionText:{color:'white',fontSize:12,fontWeight:'600'},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  statCard:{width:'48%',padding:16,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#ebe7e2',alignItems:'center',gap:4},
  statValue:{fontSize:24,fontWeight:'700',color:'#4a4540'},statLabel:{fontSize:12,color:'#b8b3ad'},
});
export default AdminScreen;
