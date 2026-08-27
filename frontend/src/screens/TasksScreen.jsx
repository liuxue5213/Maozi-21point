/**
 * 帽子21点 - 每日任务
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from '../rnw';
import useGameStore from '../store/gameStore';

const TasksScreen = ({ onBack }) => {
  const { token, user, updateUserInfo } = useGameStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/checkin/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTasks(data.tasks || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleClaim = async (taskType) => {
    try {
      const res = await fetch('/api/users/checkin/tasks/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        if (data.chips !== undefined) updateUserInfo({ chips: data.chips });
        setTimeout(() => setMessage(''), 2500);
        fetchTasks();
      } else {
        setMessage(data.error || '领取失败');
        setTimeout(() => setMessage(''), 2500);
      }
    } catch (e) {
      setMessage('领取失败');
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>每日任务</Text>
        <Text style={s.chips}>💰 {user?.chips || 0}</Text>
      </View>

      {message ? (
        <View style={s.msgBar}><Text style={s.msgText}>{message}</Text></View>
      ) : null}

      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {loading ? (
          <Text style={s.empty}>加载中...</Text>
        ) : tasks.length === 0 ? (
          <Text style={s.empty}>暂无任务</Text>
        ) : (
          tasks.map(t => (
            <View key={t.type} style={s.taskCard}>
              <View style={s.taskLeft}>
                <Text style={s.taskIcon}>{t.icon}</Text>
                <View style={s.taskInfo}>
                  <Text style={s.taskName}>{t.name}</Text>
                  <View style={s.progressRow}>
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, { width: `${Math.min(100, (t.progress / t.target) * 100)}%` }]} />
                    </View>
                    <Text style={s.progressText}>{t.progress}/{t.target}</Text>
                  </View>
                </View>
              </View>
              <View style={s.taskRight}>
                <Text style={s.reward}>💰{t.reward}</Text>
                <TouchableOpacity
                  style={[s.claimBtn, (!t.completed || t.claimed) && s.claimBtnDisabled]}
                  onPress={() => handleClaim(t.type)}
                  disabled={!t.completed || t.claimed}
                >
                  <Text style={s.claimText}>{t.claimed ? '已领取' : t.completed ? '领取' : '未完成'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <Text style={s.hint}>任务每天0点重置</Text>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6,width:40},backText:{fontSize:20,color:'#7a7068'},
  title:{fontSize:16,fontWeight:'600',color:'#4a4540'},
  chips:{fontSize:13,color:'#c4945c',fontWeight:'600',width:80,textAlign:'right'},
  msgBar:{backgroundColor:'#e8f5e9',padding:10,marginHorizontal:16,marginTop:8,borderRadius:8},
  msgText:{color:'#6b9b6a',fontSize:12,textAlign:'center'},
  content:{flex:1},contentInner:{padding:16,gap:10},
  empty:{fontSize:13,color:'#b8b3ad',textAlign:'center',padding:24},
  taskCard:{flexDirection:'row',alignItems:'center',padding:12,backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:'#ebe7e2',gap:10},
  taskLeft:{flex:1,flexDirection:'row',alignItems:'center',gap:10},
  taskIcon:{fontSize:24},
  taskInfo:{flex:1,gap:6},
  taskName:{fontSize:14,fontWeight:'600',color:'#4a4540'},
  progressRow:{flexDirection:'row',alignItems:'center',gap:8},
  progressBg:{flex:1,height:6,backgroundColor:'#f0ece6',borderRadius:3,overflow:'hidden'},
  progressFill:{height:6,backgroundColor:'#6b9b6a',borderRadius:3},
  progressText:{fontSize:10,color:'#b8b3ad',width:36},
  taskRight:{alignItems:'flex-end',gap:6},
  reward:{fontSize:13,fontWeight:'600',color:'#c4945c'},
  claimBtn:{paddingVertical:6,paddingHorizontal:14,backgroundColor:'#6b9b6a',borderRadius:6},
  claimBtnDisabled:{backgroundColor:'#ebe7e2'},
  claimText:{color:'white',fontSize:11,fontWeight:'600'},
  hint:{fontSize:11,color:'#b8b3ad',textAlign:'center',marginTop:8},
});
export default TasksScreen;
