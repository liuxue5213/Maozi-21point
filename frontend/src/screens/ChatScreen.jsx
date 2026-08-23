import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from '../rnw';
import useGameStore from '../store/gameStore';

const ChatScreen = ({ onBack }) => {
  const { token, user, socket } = useGameStore();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    socket.on('chat:message', (msg) => {
      setMessages(prev => [...prev.slice(-99), msg]);
    });
    socket.on('onlineCount', (data) => {
      setOnlineUsers(data.users || []);
    });
    return () => {
      socket.off('chat:message');
      socket.off('onlineCount');
    };
  }, [socket]);

  const sendMessage = () => {
    if (!inputText.trim() || !socket) return;
    socket.emit('chat:message', { message: inputText.trim() });
    setInputText('');
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>世界聊天</Text>
        <Text style={s.online}>{onlineUsers.length || '?'}人在线</Text>
      </View>
      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesInner} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
        {messages.length === 0 && <Text style={s.empty}>暂无消息，发送第一条吧！</Text>}
        {messages.map((msg, i) => (
          <View key={i} style={[s.msgItem, msg.username === user?.username && s.msgSelf]}>
            <Text style={s.msgName}>{msg.username}</Text>
            <Text style={s.msgText}>{msg.message}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={s.inputBar}>
        <TextInput style={s.input} placeholder="输入消息..." value={inputText} onChangeText={setInputText} onSubmitEditing={sendMessage} maxLength={200} />
        <TouchableOpacity style={s.sendBtn} onPress={sendMessage}><Text style={s.sendText}>发送</Text></TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#faf9f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#ebe7e2'},
  backBtn:{padding:6},backText:{fontSize:20,color:'#7a7068'},title:{fontSize:16,fontWeight:'600',color:'#4a4540'},online:{fontSize:12,color:'#6b9b6a'},
  messages:{flex:1},messagesInner:{padding:16,gap:8},
  empty:{fontSize:13,color:'#b8b3ad',textAlign:'center',padding:24},
  msgItem:{padding:10,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#ebe7e2',maxWidth:'80%'},
  msgSelf:{backgroundColor:'#e8f5e9',marginLeft:'20%'},
  msgName:{fontSize:11,color:'#6b9b6a',marginBottom:4},msgText:{fontSize:14,color:'#4a4540'},
  inputBar:{flexDirection:'row',gap:8,padding:12,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#ebe7e2'},
  input:{flex:1,padding:10,backgroundColor:'#f5f3f0',borderRadius:8,fontSize:14,color:'#4a4540'},
  sendBtn:{paddingVertical:10,paddingHorizontal:16,backgroundColor:'#6b9b6a',borderRadius:8,justifyContent:'center'},
  sendText:{color:'white',fontSize:14,fontWeight:'600'},
});
export default ChatScreen;
