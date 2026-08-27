/**
 * 帽子21点 - 锦标赛页面
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal } from '../rnw';
import useGameStore from '../store/gameStore';

const TournamentScreen = ({ onBack }) => {
  const { token, user } = useGameStore();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFee, setNewFee] = useState('100');
  const [newPrize, setNewPrize] = useState('1000');
  const [creating, setCreating] = useState(false);
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tournament/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTournaments(data.tournaments || []);
      else setError(data.error || '获取比赛失败');
    } catch (e) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { setError('请输入比赛名称'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/tournament/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), entryFee: parseInt(newFee) || 0, prizePool: parseInt(newPrize) || 0 })
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreate(false);
        setNewName('');
        fetchTournaments();
      } else {
        setError(data.error || '创建失败');
      }
    } catch (e) {
      setError('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (id) => {
    setJoining(id);
    setError('');
    try {
      const res = await fetch('/api/tournament/join', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: id })
      });
      const data = await res.json();
      if (res.ok) fetchTournaments();
      else setError(data.error || '报名失败');
    } catch (e) {
      setError('报名失败');
    } finally {
      setJoining('');
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>锦标赛</Text>
        {isAdmin ? (
          <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.createBtnText}>+ 创建</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.refreshBtn} onPress={fetchTournaments}>
            <Text style={s.refreshText}>刷新</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={s.errorBar}><Text style={s.errorText}>{error}</Text></View>
      ) : null}

      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {loading ? (
          <Text style={s.empty}>加载中...</Text>
        ) : tournaments.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.empty}>{isAdmin ? '暂无比赛，点击右上角创建' : '暂无比赛'}</Text>
          </View>
        ) : (
          tournaments.map(t => (
            <View key={t.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardName}>{t.name}</Text>
                <View style={[s.statusBadge, t.status === 'active' && s.statusActive]}>
                  <Text style={s.statusText}>{t.status === 'pending' ? '报名中' : '进行中'}</Text>
                </View>
              </View>
              <View style={s.cardInfo}>
                <Text style={s.infoItem}>👥 {t.participants}/{t.maxPlayers}人</Text>
                <Text style={s.infoItem}>💰 奖池 {t.prize}</Text>
                <Text style={s.infoItem}>🎫 门票 {t.entryFee}</Text>
              </View>
              <TouchableOpacity
                style={[s.joinBtn, (t.isRegistered || joining === t.id) && s.joinBtnDisabled]}
                onPress={() => handleJoin(t.id)}
                disabled={t.isRegistered || joining === t.id}
              >
                <Text style={s.joinText}>{t.isRegistered ? '已报名' : joining === t.id ? '报名中...' : '立即报名'}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 创建比赛弹窗 */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>创建锦标赛</Text>
            <TextInput style={s.input} placeholder="比赛名称" value={newName} onChangeText={setNewName} maxLength={20} />
            <TextInput style={s.input} placeholder="门票价格" value={newFee} onChangeText={setNewFee} keyboardType="numeric" />
            <TextInput style={s.input} placeholder="奖池筹码" value={newPrize} onChangeText={setNewPrize} keyboardType="numeric" />
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => setShowCreate(false)}>
                <Text style={s.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.confirmBtn]} onPress={handleCreate} disabled={creating}>
                <Text style={s.confirmText}>{creating ? '创建中...' : '创建'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6,width:40},backText:{fontSize:20,color:'#7a7068'},title:{fontSize:16,fontWeight:'600',color:'#4a4540'},
  createBtn:{paddingVertical:6,paddingHorizontal:12,backgroundColor:'#6b9b6a',borderRadius:6},
  createBtnText:{color:'white',fontSize:12,fontWeight:'600'},
  refreshBtn:{padding:6,width:40,alignItems:'flex-end'},refreshText:{fontSize:12,color:'#6b9b6a'},
  errorBar:{backgroundColor:'#fee',padding:10,marginHorizontal:16,marginTop:8,borderRadius:8},
  errorText:{color:'#c33',fontSize:12,textAlign:'center'},
  content:{flex:1},contentInner:{padding:16,gap:12},
  emptyBox:{alignItems:'center',padding:40},empty:{fontSize:13,color:'#b8b3ad'},
  card:{padding:14,backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:'#ebe7e2',gap:10},
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  cardName:{fontSize:15,fontWeight:'600',color:'#4a4540'},
  statusBadge:{paddingVertical:2,paddingHorizontal:8,backgroundColor:'#f0ece6',borderRadius:10},
  statusActive:{backgroundColor:'#e8f5e9'},
  statusText:{fontSize:10,color:'#8a8580'},
  cardInfo:{flexDirection:'row',gap:12,flexWrap:'wrap'},
  infoItem:{fontSize:12,color:'#7a7068'},
  joinBtn:{paddingVertical:10,backgroundColor:'#6b9b6a',borderRadius:8,alignItems:'center'},
  joinBtnDisabled:{backgroundColor:'#b8b3ad'},
  joinText:{color:'white',fontSize:13,fontWeight:'600'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center'},
  modalBox:{width:'85%',backgroundColor:'white',borderRadius:12,padding:20,gap:12},
  modalTitle:{fontSize:16,fontWeight:'600',color:'#4a4540',textAlign:'center',marginBottom:4},
  input:{padding:12,backgroundColor:'#f5f3f0',borderRadius:8,fontSize:14,color:'#4a4540'},
  modalBtns:{flexDirection:'row',gap:10,marginTop:8},
  modalBtn:{flex:1,paddingVertical:12,borderRadius:8,alignItems:'center'},
  cancelBtn:{backgroundColor:'#f0ece6'},confirmBtn:{backgroundColor:'#6b9b6a'},
  cancelText:{color:'#7a7068',fontSize:14},confirmText:{color:'white',fontSize:14,fontWeight:'600'},
});
export default TournamentScreen;
