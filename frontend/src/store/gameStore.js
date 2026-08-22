/**
 * 帽子21点 - 全局状态管理 (Zustand)
 */

import { create } from 'zustand';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.hostname
  ? `${window.location.protocol}//${window.location.hostname}:60215`
  : 'http://localhost:60215';

const useGameStore = create((set, get) => ({
  // 玩家信息
  playerName: localStorage.getItem('playerName') || '',
  playerId: '',
  
  // Socket连接
  socket: null,
  connected: false,
  
  // 游戏状态
  gameId: null,
  gameMode: null, // 'pve' | 'pvp'
  gameState: null,
  currentScreen: 'home', // 'home' | 'lobby' | 'game' | 'waiting'
  
  // UI状态
  message: '',
  error: '',
  
  // 设置玩家名
  setPlayerName: (name) => {
    localStorage.setItem('playerName', name);
    set({ playerName: name });
  },
  
  // 连接Socket
  connect: () => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socket.on('connect', () => {
      set({ connected: true, socket });
      const { playerName } = get();
      socket.emit('setPlayer', { name: playerName || '玩家' + socket.id.slice(0, 4) });
    });
    
    socket.on('disconnect', () => {
      set({ connected: false });
    });
    
    socket.on('playerSet', (data) => {
      set({ playerId: data.id, playerName: data.name });
    });
    
    socket.on('gameCreated', (data) => {
      set({ gameId: data.gameId, gameMode: data.mode, currentScreen: 'game', message: '' });
    });
    
    socket.on('waitingMatch', () => {
      set({ currentScreen: 'waiting', message: '正在寻找对手...' });
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
    const { socket } = get();
    if (socket) {
      socket.emit('startPvE');
    }
  },
  
  // 开始匹配
  startMatch: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('startMatch');
    }
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
    set({ currentScreen: 'lobby', gameId: null, gameState: null, message: '' });
  },
}));

export default useGameStore;
