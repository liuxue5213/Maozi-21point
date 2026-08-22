/**
 * 帽子21点 - 主应用入口 (React Native Web)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from './rnw';
import useGameStore from './store/gameStore';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import WaitingScreen from './screens/WaitingScreen';

function App() {
  const { currentScreen, connect, disconnect } = useGameStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  const renderScreen = () => {
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
        return <HomeScreen />;
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
