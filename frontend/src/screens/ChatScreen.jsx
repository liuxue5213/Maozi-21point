/**
 * 帽子21点 - 世界聊天室
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from '../rnw';
import useGameStore from '../store/gameStore';

const ChatScreen = ({ onBack }) => {
  const { user, socket, connected, token } = useGameStore();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  // 加载聊天历史
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch('/api/users/chat/history?limit=50', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.messages) {
          setMessages(data.messages);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
        }
      } catch (e) { console.error(e); }
    };
    loadHistory();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data) => {
      setMessages((prev) => [...prev.slice(-99), data]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    socket.on('chat:message', handleMessage);
    return () => socket.off('chat:message', handleMessage);
  }, [socket]);

  const handleSend = () => {
    if (!inputText.trim() || !connected || !socket) return;
    socket.emit('chat:message', { message: inputText.trim() });
    setInputText('');
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>世界聊天室</Text>
        <View style={s.status}>
          <View style={[s.dot, { backgroundColor: connected ? '#6b9b6a' : '#c9605a' }]} />
          <Text style={s.statusText}>{connected ? '已连接' : '连接中'}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesInner}>
        {messages.length === 0 && <Text style={s.empty}>暂无消息，发送第一条吧！</Text>}
        {messages.map((msg, i) => {
          const isSelf = msg.username === user?.username;
          return (
            <View key={i} style={[s.msgItem, isSelf && s.msgSelf]}>
              <Text style={s.msgName}>{msg.username}</Text>
              <View style={[s.bubble, isSelf && s.bubbleSelf]}>
                <Text style={[s.msgText, isSelf && s.msgTextSelf]}>{msg.message}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={s.inputBar}>
        <TextInput style={s.input} placeholder="输入消息..." placeholderTextColor="#b8b3ad" value={inputText} onChangeText={setInputText} onSubmitEditing={handleSend} maxLength={200} />
        <TouchableOpacity style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]} onPress={handleSend} disabled={!inputText.trim()}>
          <Text style={s.sendText}>发送</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6},backText:{fontSize:20,color:'#7a7068'},title:{fontSize:16,fontWeight:'600',color:'#4a4540'},
  status:{flexDirection:'row',alignItems:'center',gap:6},dot:{width:8,height:8,borderRadius:4},statusText:{fontSize:12,color:'#8a8580'},
  messages:{flex:1},messagesInner:{padding:16,gap:8},
  empty:{fontSize:13,color:'#b8b3ad',textAlign:'center',padding:24},
  msgItem:{maxWidth:'80%'},msgSelf:{alignSelf:'flex-end',alignItems:'flex-end'},
  msgName:{fontSize:11,color:'#8a8580',marginBottom:2,marginLeft:4},
  bubble:{padding:10,borderRadius:12,backgroundColor:'white',borderWidth:1,borderColor:'#ebe7e2'},
  bubbleSelf:{backgroundColor:'#6b9b6a',borderColor:'#6b9b6a'},
  msgText:{fontSize:13,color:'#4a4540'},msgTextSelf:{color:'white'},
  inputBar:{flexDirection:'row',gap:8,padding:12,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#ebe7e2'},
  input:{flex:1,padding:10,backgroundColor:'#f5f3f0',borderRadius:8,fontSize:14,color:'#4a4540'},
  sendBtn:{paddingVertical:10,paddingHorizontal:16,backgroundColor:'#6b9b6a',borderRadius:8,justifyContent:'center'},
  sendBtnDisabled:{backgroundColor:'#ebe7e2'},sendText:{color:'white',fontSize:14,fontWeight:'600'},
});
export default ChatScreen;
