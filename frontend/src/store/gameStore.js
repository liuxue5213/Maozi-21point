/**
 * 帽子21点 - 全局状态管理 (Zustand)
 */

import { create } from 'zustand';
import { io } from 'socket.io-client';

// 服务器地址 - 开发时使用本地，生产时使用服务器IP
const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || 'localhost';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${SERVER_HOST}:60215`;

const useGameStore = create((set, get) => ({
  // 认证状态
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),

  // 玩家信息
  playerName: (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      return user?.username || localStorage.getItem('playerName') || localStorage.getItem('playerName_backup') || '';
    } catch (e) {
      return '';
    }
  })(),
  playerId: '',

  // Socket连接
  socket: null,
  connected: false,

  // 游戏状态
  gameId: null,
  gameMode: null, // 'pve' | 'pvp'
  gameState: null,
  currentScreen: 'auth', // 'auth' | 'home' | 'lobby' | 'game' | 'waiting'

  // UI状态
  message: '',
  error: '',
  onlineCount: 0,
  matchingCount: 0,

  // 签到状态
  checkinStreak: 0,
  checkinToday: false,

  // 好友列表
  friends: [],
  friendRequests: [],

  // 成就
  achievements: [],

  // 当前用户完整信息
  userLevel: 1,
  userExp: 0,

  // 登录
  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({
      token,
      user,
      isAuthenticated: true,
      playerName: user.username,
      currentScreen: 'lobby'
    });
  },

  // 登出
  logout: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      socket: null,
      connected: false,
      playerName: '',
      playerId: '',
      currentScreen: 'auth'
    });
  },

  // 设置玩家名
  setPlayerName: (name) => {
    try {
      localStorage.setItem('playerName', name);
      localStorage.setItem('playerName_backup', name);
    } catch (e) {
      console.warn('localStorage保存失败:', e);
    }
    set({ playerName: name });
  },

  // 连接Socket (带认证)
  connect: () => {
    const { token } = get();
    console.log('正在连接Socket服务器:', SOCKET_URL);

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: { token } // JWT认证
    });

    socket.on('connect', () => {
      console.log('Socket连接成功:', socket.id);
      set({ connected: true, socket });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket连接错误:', error);
      if (error.message.includes('认证')) {
        // Token过期或无效，返回登录页
        get().logout();
      } else {
        set({ error: '连接服务器失败，请检查网络' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket断开连接');
      set({ connected: false });
    });

    socket.on('playerSet', (data) => {
      console.log('玩家信息设置成功:', data);
      set({
        playerId: data.id,
        playerName: data.name,
        user: { ...get().user, chips: data.chips }
      });
    });

    socket.on('userInfo', (data) => {
      console.log('用户信息更新:', data);
      set({
        user: { ...get().user, ...data }
      });
    });

    socket.on('gameCreated', (data) => {
      console.log('游戏创建成功:', data);
      set({ gameId: data.gameId, gameMode: data.mode, currentScreen: 'game', message: '' });
    });

    socket.on('waitingMatch', () => {
      set({ currentScreen: 'waiting', message: '正在匹配玩家中...' });
    });

    socket.on('onlineCount', (data) => {
      set({ onlineCount: data.count || 0, matchingCount: data.matching || 0 });
    });

    socket.on('matchCancelled', () => {
      set({ currentScreen: 'lobby', message: '' });
    });

    socket.on('gameState', (state) => {
      set({ gameState: state });
    });

    socket.on('opponentLeft', () => {
      set({ message: '对手已离开游戏', currentScreen: 'lobby' });
    });

    return socket;
  },
  
  // 断开连接
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },
  
  // 开始人机对战
  startPvE: () => {
    const { socket, connected } = get();
    if (!socket || !connected) {
      set({ error: '网络连接中，请稍后...' });
      return;
    }
    console.log('开始人机对战...');
    socket.emit('startPvE');
  },

  // 开始匹配
  startMatch: () => {
    const { socket, connected } = get();
    if (!socket || !connected) {
      set({ error: '网络连接中，请稍后...' });
      return;
    }
    console.log('开始匹配...');
    socket.emit('startMatch');
  },
  
  // 取消匹配
  cancelMatch: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('cancelMatch');
    }
  },
  
  // 下注
  placeBet: (amount) => {
    const { socket } = get();
    if (socket) {
      socket.emit('placeBet', { amount });
    }
  },
  
  // 要牌
  hit: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('hit');
    }
  },
  
  // 停牌
  stand: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('stand');
    }
  },
  
  // 加倍
  doubleDown: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('doubleDown');
    }
  },
  
  // 下一轮
  nextRound: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('nextRound');
    }
  },
  
  // 设置当前页面
  setScreen: (screen) => set({ currentScreen: screen }),
  
  // 返回大厅
  backToLobby: () => {
    set({ currentScreen: 'lobby', gameId: null, gameState: null, message: '', error: '' });
  },

  // 清除错误
  clearError: () => {
    set({ error: '' });
  },

  // 签到
  checkin: async () => {
    const { token } = get();
    try {
      const response = await fetch('/api/users/checkin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        set({
          checkinStreak: data.streak || 0,
          checkinToday: true,
          user: { ...get().user, chips: data.chips ?? get().user?.chips }
        });
        return { success: true, data };
      } else {
        return { success: false, error: data.error || '签到失败' };
      }
    } catch (error) {
      console.error('签到失败:', error);
      return { success: false, error: '网络错误' };
    }
  },

  // 获取好友列表
  fetchFriends: async () => {
    const { token } = get();
    try {
      const response = await fetch('/api/users/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        set({ friends: data.friends || [], friendRequests: data.requests || [] });
      }
    } catch (error) {
      console.error('获取好友列表失败:', error);
    }
  },

  // 添加好友
  addFriend: async (username) => {
    const { token } = get();
    try {
      const response = await fetch('/api/users/friends/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.error || '添加失败' };
      }
    } catch (error) {
      console.error('添加好友失败:', error);
      return { success: false, error: '网络错误' };
    }
  },

  // 获取成就
  fetchAchievements: async () => {
    const { token } = get();
    try {
      const response = await fetch('/api/users/achievements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        set({ achievements: data.achievements || [] });
      }
    } catch (error) {
      console.error('获取成就失败:', error);
    }
  },

  // 更新用户信息
  updateUserInfo: (data) => {
    set({
      user: { ...get().user, ...data },
      userLevel: data.level ?? get().userLevel,
      userExp: data.exp ?? get().userExp,
      playerName: data.username ?? get().playerName,
    });
  },
}));

export default useGameStore;
