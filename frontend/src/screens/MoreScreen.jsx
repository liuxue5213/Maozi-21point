/**
 * 帽子21点 - 更多功能
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const MoreScreen = ({ onBack }) => {
  const { user, setScreen } = useGameStore();
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;

  const items = [
    { key: 'friends', icon: '👥', label: '好友', desc: '查看和管理好友' },
    { key: 'chat', icon: '💬', label: '聊天室', desc: '和其他玩家聊天' },
    { key: 'shop', icon: '🛒', label: '商店', desc: '购买道具和筹码' },
    { key: 'tournament', icon: '🎯', label: '锦标赛', desc: '参加比赛赢取奖金' },
  ];

  if (isAdmin) {
    items.push({ key: 'admin', icon: '🔧', label: '管理后台', desc: '用户管理和数据统计' });
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>更多功能</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.list}>
        {items.map(item => (
          <TouchableOpacity key={item.key} style={s.item} onPress={() => setScreen(item.key)}>
            <Text style={s.icon}>{item.icon}</Text>
            <View style={s.info}>
              <Text style={s.label}>{item.label}</Text>
              <Text style={s.desc}>{item.desc}</Text>
            </View>
            <Text style={s.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6},backText:{fontSize:20,color:'#7a7068'},title:{fontSize:16,fontWeight:'600',color:'#4a4540'},
  list:{padding:16,gap:10},
  item:{flexDirection:'row',alignItems:'center',gap:12,padding:14,backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:'#ebe7e2'},
  icon:{fontSize:24},info:{flex:1,gap:2},label:{fontSize:15,fontWeight:'600',color:'#4a4540'},desc:{fontSize:12,color:'#b8b3ad'},
  arrow:{fontSize:16,color:'#d5d0ca'},
});
export default MoreScreen;
