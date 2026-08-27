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
import ProfileScreen from './screens/ProfileScreen';
import CheckinScreen from './screens/CheckinScreen';
import FriendsScreen from './screens/FriendsScreen';
import AdminScreen from './screens/AdminScreen';
import ChatScreen from './screens/ChatScreen';
import ShopScreen from './screens/ShopScreen';
import TournamentScreen from './screens/TournamentScreen';
import MoreScreen from './screens/MoreScreen';
import TasksScreen from './screens/TasksScreen';

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
      case 'profile':
        return <ProfileScreen onBack={() => setScreen('lobby')} />;
      case 'checkin':
        return <CheckinScreen onBack={() => setScreen('lobby')} />;
      case 'friends':
        return <FriendsScreen onBack={() => setScreen('lobby')} />;
      case 'admin':
        return <AdminScreen onBack={() => setScreen('lobby')} />;
      case 'chat':
        return <ChatScreen onBack={() => setScreen('lobby')} />;
      case 'shop':
        return <ShopScreen onBack={() => setScreen('lobby')} />;
      case 'tournament':
        return <TournamentScreen onBack={() => setScreen('lobby')} />;
      case 'more':
        return <MoreScreen onBack={() => setScreen('lobby')} />;
      case 'tasks':
        return <TasksScreen onBack={() => setScreen('lobby')} />;
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
