import { toast } from "../utils/toast";
/**
 * 帽子21点 - 每日签到
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const CheckinScreen = ({ onBack }) => {
  const { token } = useGameStore();
  const [streak, setStreak] = useState(0);
  const [todayChecked, setTodayChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchCheckinStatus(); }, []);

  const fetchCheckinStatus = async () => {
    try {
      const res = await fetch('/api/users/checkin/status', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setStreak(data.status?.currentStreak || 0);
      setTodayChecked(data.status?.checkedToday || false);
    } catch (e) { console.error(e); }
  };

  const handleCheckin = async () => {
    if (todayChecked) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users/checkin', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { setTodayChecked(true); setStreak(data.checkin.streakDay); toast.info(`获得 ${data.checkin.totalReward} 筹码！`); }
      else toast.info(data.error || '签到失败');
    } catch (e) { toast.info('签到失败'); }
    setLoading(false);
  };

  const days = ['一', '二', '三', '四', '五', '六', '日'];
  const currentDay = (new Date().getDay() + 6) % 7;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>每日签到</Text><View style={{width:40}} />
      </View>
      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        <View style={s.streakCard}><Text style={s.streakNum}>{streak}</Text><Text style={s.streakLabel}>连续签到天数</Text></View>
        <TouchableOpacity style={[s.btn, todayChecked && s.btnDisabled]} onPress={handleCheckin} disabled={todayChecked || loading}>
          <Text style={s.btnText}>{todayChecked ? '今日已签到' : loading ? '签到中...' : '立即签到'}</Text>
        </TouchableOpacity>
        <View style={s.calendar}>
          {days.map((d,i) => (
            <View key={i} style={[s.day, i < streak && s.dayActive, i === currentDay && s.dayToday]}>
              <Text style={[s.dayText, (i < streak || i === currentDay) && s.dayTextActive]}>周{d}</Text>
              <Text style={s.dayReward}>+{50+i*10}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6},backText:{fontSize:20,color:'#7a7068'},title:{fontSize:16,fontWeight:'600',color:'#4a4540'},
  content:{flex:1},contentInner:{padding:16,gap:16},
  streakCard:{alignItems:'center',padding:24,backgroundColor:'#c4945c',borderRadius:12,gap:8},
  streakNum:{fontSize:48,fontWeight:'700',color:'white'},streakLabel:{fontSize:14,color:'rgba(255,255,255,0.8)'},
  btn:{paddingVertical:16,backgroundColor:'#6b9b6a',borderRadius:8,alignItems:'center'},
  btnDisabled:{backgroundColor:'#b8b3ad'},btnText:{color:'white',fontSize:16,fontWeight:'600'},
  calendar:{flexDirection:'row',gap:8},
  day:{flex:1,padding:10,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#ebe7e2',alignItems:'center',gap:4},
  dayActive:{backgroundColor:'#e8f5e9',borderColor:'#6b9b6a'},dayToday:{borderColor:'#c4945c',borderWidth:2},
  dayText:{fontSize:12,color:'#b8b3ad'},dayTextActive:{color:'#4a4540',fontWeight:'600'},dayReward:{fontSize:10,color:'#c4945c'},
});
export default CheckinScreen;
