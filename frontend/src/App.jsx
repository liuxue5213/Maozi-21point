/**
 * 帽子21点 - 主应用入口 (React Native Web)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from './rnw';
import useGameStore from './store/gameStore';
import AuthScreen from './screens/AuthScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import WaitingScreen from './screens/WaitingScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

function App() {
  const { currentScreen, connect, disconnect, isAuthenticated, setScreen } = useGameStore();

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }
    return () => disconnect();
  }, [isAuthenticated]);

  const renderScreen = () => {
    if (!isAuthenticated) {
      return <AuthScreen />;
    }

    switch (currentScreen) {
      case 'lobby':
        return <LobbyScreen />;
      case 'game':
        return <GameScreen />;
      case 'waiting':
        return <WaitingScreen />;
      case 'leaderboard':
        return <LeaderboardScreen onBack={() => setScreen('lobby')} />;
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
