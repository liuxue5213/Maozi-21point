import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const TournamentScreen = ({ onBack }) => {
  const { token } = useGameStore();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournament/list', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTournaments(data.tournaments || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const joinTournament = async (id) => {
    try {
      const res = await fetch('/api/tournament/join', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ tournamentId: id }) });
      const data = await res.json();
      if (res.ok) { window.alert('报名成功！'); fetchTournaments(); }
      else window.alert(data.error || '报名失败');
    } catch (e) { window.alert('报名失败'); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>比赛</Text><View style={{width:40}} />
      </View>
      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {loading ? <Text style={s.empty}>加载中...</Text> : tournaments.length === 0 ? (
            <View style={s.emptyBox}><Text style={s.empty}>暂无比赛</Text><Text style={s.emptySub}>管理员可以创建定时比赛</Text></View>
        ) : tournaments.map(t => (
          <View key={t.id} style={s.tournamentCard}>
            <Text style={s.tournamentName}>{t.name || '定时锦标赛'}</Text>
            <Text style={s.tournamentInfo}>参赛人数: {t.playerCount || 0}/{t.maxPlayers || 32}</Text>
            <Text style={s.tournamentInfo}>奖金池: 💰{t.prizePool || 0}</Text>
            <Text style={s.tournamentTime}>开始时间: {t.startTime || '待定'}</Text>
            <TouchableOpacity style={s.joinBtn} onPress={() => joinTournament(t.id)}><Text style={s.joinText}>报名参赛</Text></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6},backText:{fontSize:20,color:'#7a7068'},title:{fontSize:16,fontWeight:'600',color:'#4a4540'},
  content:{flex:1},contentInner:{padding:16,gap:12},
  emptyBox:{alignItems:'center',padding:40,gap:8},empty:{fontSize:14,color:'#b8b3ad'},emptySub:{fontSize:12,color:'#d5d0ca'},
  tournamentCard:{padding:16,backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:'#ebe7e2',gap:8},
  tournamentName:{fontSize:16,fontWeight:'600',color:'#4a4540'},
  tournamentInfo:{fontSize:13,color:'#7a7068'},tournamentTime:{fontSize:12,color:'#b8b3ad'},
  joinBtn:{paddingVertical:10,backgroundColor:'#c4945c',borderRadius:8,alignItems:'center',marginTop:8},
  joinText:{color:'white',fontSize:14,fontWeight:'600'},
});
export default TournamentScreen;
