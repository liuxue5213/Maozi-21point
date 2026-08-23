/**
 * 帽子21点 - 世界聊天室
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from '../rnw';
import useGameStore from '../store/gameStore';

const ChatScreen = ({ onBack }) => {
  const { token, user, socket, connected } = useGameStore();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
    fetchOnlineUsers();

    // 监听Socket消息
    if (socket) {
      socket.on('chatMessage', (data) => {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
      });

      socket.on('onlineUsersList', (data) => {
        setOnlineUsers(data.users || []);
      });

      return () => {
        socket.off('chatMessage');
        socket.off('onlineUsersList');
      };
    }
  }, [socket]);

  const fetchChatHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chat/history?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      } else {
        setError(data.error || '获取聊天记录失败');
      }
    } catch (err) {
      console.error('获取聊天记录失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await fetch('/api/chat/online-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setOnlineUsers(data.users || []);
      }
    } catch (err) {
      console.error('获取在线用户失败:', err);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !connected || !socket) return;

    socket.emit('chatMessage', {
      text: inputText.trim(),
      sender: user?.username || '匿名',
      senderId: user?.id,
      timestamp: new Date().toISOString()
    });

    setInputText('');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>世界聊天室</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#6b9b6a' : '#c9605a' }]} />
          <Text style={styles.onlineCount}>{onlineUsers.length}在线</Text>
        </View>
      </View>

      {/* 错误提示 */}
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        {/* 在线用户列表 */}
        <View style={styles.usersPanel}>
          <Text style={styles.usersPanelTitle}>在线玩家</Text>
          <ScrollView style={styles.usersList} nestedScrollEnabled>
            {onlineUsers.length === 0 ? (
              <Text style={styles.emptyText}>暂无在线玩家</Text>
            ) : (
              onlineUsers.map((player, index) => (
                <View key={player.id || index} style={styles.userItem}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {player.username ? player.username[0].toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{player.username || '匿名'}</Text>
                    <Text style={styles.userLevel}>Lv.{player.level || 1}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* 聊天区域 */}
        <View style={styles.chatPanel}>
          {/* 消息列表 */}
          <ScrollView
            ref={scrollRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
          >
            {loading ? (
              <View style={styles.loading}>
                <Text style={styles.loadingText}>加载消息中...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无消息，发送第一条吧！</Text>
              </View>
            ) : (
              messages.map((msg, index) => {
                const isSelf = msg.senderId === user?.id || msg.sender === user?.username;
                return (
                  <View
                    key={msg.id || index}
                    style={[
                      styles.messageItem,
                      isSelf ? styles.messageSelf : styles.messageOther
                    ]}
                  >
                    {!isSelf && (
                      <Text style={styles.messageSender}>{msg.sender}</Text>
                    )}
                    <View style={[
                      styles.messageBubble,
                      isSelf ? styles.bubbleSelf : styles.bubbleOther
                    ]}>
                      <Text style={[
                        styles.messageText,
                        isSelf && styles.messageTextSelf
                      ]}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={[
                      styles.messageTime,
                      isSelf && styles.messageTimeSelf
                    ]}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* 输入框 */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="输入消息..."
              placeholderTextColor="#b8b3ad"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || !connected) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || !connected}
            >
              <Text style={[styles.sendBtnText, (!inputText.trim() || !connected) && styles.sendBtnTextDisabled]}>
                发送
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineCount: {
    fontSize: 12,
    color: '#8a8580',
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
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  usersPanel: {
    width: 120,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ebe7e2',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  usersPanelTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b8b3ad',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#f0ece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8a8580',
  },
  userInfo: {
    flex: 1,
    gap: 0,
  },
  userName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#4a4540',
  },
  userLevel: {
    fontSize: 8,
    color: '#b8b3ad',
  },
  chatPanel: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    gap: 8,
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#b8b3ad',
    fontSize: 14,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#b8b3ad',
    fontSize: 13,
  },
  messageItem: {
    maxWidth: '75%',
  },
  messageSelf: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageSender: {
    fontSize: 11,
    color: '#8a8580',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bubbleSelf: {
    backgroundColor: '#6b9b6a',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ebe7e2',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#4a4540',
    lineHeight: 1.4,
  },
  messageTextSelf: {
    color: 'white',
  },
  messageTime: {
    fontSize: 9,
    color: '#b8b3ad',
    marginTop: 2,
    marginHorizontal: 4,
  },
  messageTimeSelf: {
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ebe7e2',
  },
  input: {
    flex: 1,
    height: 38,
    paddingHorizontal: 12,
    backgroundColor: '#f5f3f0',
    borderRadius: 18,
    fontSize: 13,
    color: '#4a4540',
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  sendBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#6b9b6a',
    borderRadius: 18,
  },
  sendBtnDisabled: {
    backgroundColor: '#ebe7e2',
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  sendBtnTextDisabled: {
    color: '#b8b3ad',
  },
});

export default ChatScreen;
