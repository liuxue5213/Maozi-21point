/**
 * 帽子21点 - 主应用入口 (React Native Web)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from './rnw';
import useGameStore from './store/gameStore';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import WaitingScreen from './screens/WaitingScreen';

function App() {
  const { currentScreen, connect, disconnect, isAuthenticated } = useGameStore();

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }
    return () => disconnect();
  }, [isAuthenticated]);

  const renderScreen = () => {
    // 未认证时显示登录/注册界面
    if (!isAuthenticated) {
      return <AuthScreen />;
    }

    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'lobby':
        return <LobbyScreen />;
      case 'game':
        return <GameScreen />;
      case 'waiting':
        return <WaitingScreen />;
      default:
        return <LobbyScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default App;
