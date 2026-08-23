import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from '../rnw';
import useGameStore from '../store/gameStore';

const FriendsScreen = ({ onBack }) => {
  const { token } = useGameStore();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchName, setSearchName] = useState('');

  useEffect(() => { fetchFriends(); fetchRequests(); }, []);

  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/users/friends', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFriends(data.friends || []);
    } catch (e) { console.error(e); }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/users/friends/requests', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) { console.error(e); }
  };

  const addFriend = async () => {
    if (!searchName.trim()) return;
    try {
      const res = await fetch('/api/users/friends/add', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ username: searchName.trim() }) });
      const data = await res.json();
      window.alert(data.message || data.error || '已发送请求');
      setSearchName('');
      fetchRequests();
    } catch (e) { window.alert('添加失败'); }
  };

  const acceptFriend = async (id) => {
    try {
      await fetch('/api/users/friends/accept', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ friendId: id }) });
      fetchFriends(); fetchRequests();
    } catch (e) { window.alert('操作失败'); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>好友</Text><View style={{width:40}} />
      </View>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab,tab==='friends'&&s.tabActive]} onPress={()=>setTab('friends')}><Text style={[s.tabText,tab==='friends'&&s.tabTextActive]}>好友({friends.length})</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab,tab==='requests'&&s.tabActive]} onPress={()=>setTab('requests')}><Text style={[s.tabText,tab==='requests'&&s.tabTextActive]}>请求({requests.length})</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab,tab==='add'&&s.tabActive]} onPress={()=>setTab('add')}><Text style={[s.tabText,tab==='add'&&s.tabTextActive]}>添加</Text></TouchableOpacity>
      </View>
      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {tab === 'friends' && (friends.length === 0 ? <Text style={s.empty}>暂无好友</Text> : friends.map(f=>(
          <View key={f.id} style={s.item}>
            <View style={[s.avatar,{backgroundColor:f.online?'#e8f5e9':'#f0ece6'}]}><Text style={s.avatarText}>♠</Text></View>
            <View style={s.itemInfo}><Text style={s.itemName}>{f.username}</Text><Text style={s.itemStatus}>{f.online?'在线':'离线'}</Text></View>
            <Text style={s.itemLevel}>Lv.{f.level||1}</Text>
          </View>
        )))}
        {tab === 'requests' && (requests.length === 0 ? <Text style={s.empty}>暂无请求</Text> : requests.map(r=>(
          <View key={r.id} style={s.item}>
            <View style={s.avatar}><Text style={s.avatarText}>♠</Text></View>
            <Text style={s.itemName}>{r.username}</Text>
            <TouchableOpacity style={s.acceptBtn} onPress={()=>acceptFriend(r.id)}><Text style={s.acceptText}>接受</Text></TouchableOpacity>
          </View>
        )))}
        {tab === 'add' && (
          <View style={s.addBox}>
            <TextInput style={s.input} placeholder="输入用户名" value={searchName} onChangeText={setSearchName} />
            <TouchableOpacity style={s.addBtn} onPress={addFriend}><Text style={s.addBtnText}>添加好友</Text></TouchableOpacity>
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
  content:{flex:1},contentInner:{padding:16,gap:8},
  empty:{fontSize:13,color:'#b8b3ad',textAlign:'center',padding:24},
  item:{flexDirection:'row',alignItems:'center',gap:12,padding:12,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#ebe7e2'},
  avatar:{width:36,height:36,borderRadius:18,backgroundColor:'#f0ece6',alignItems:'center',justifyContent:'center'},
  avatarText:{fontSize:14,color:'#8a8580'},
  itemInfo:{flex:1,gap:2},itemName:{fontSize:14,fontWeight:'600',color:'#4a4540'},itemStatus:{fontSize:11,color:'#b8b3ad'},
  itemLevel:{fontSize:11,color:'#6b9b6a'},
  acceptBtn:{paddingVertical:6,paddingHorizontal:12,backgroundColor:'#6b9b6a',borderRadius:6},acceptText:{color:'white',fontSize:12,fontWeight:'600'},
  addBox:{gap:12},input:{padding:12,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#ebe7e2',fontSize:14,color:'#4a4540'},
  addBtn:{paddingVertical:14,backgroundColor:'#6b9b6a',borderRadius:8,alignItems:'center'},addBtnText:{color:'white',fontSize:14,fontWeight:'600'},
});
export default FriendsScreen;
