/**
 * 帽子21点 - 首页 (超浅色自然风格)
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const HomeScreen = () => {
  const [name, setName] = useState('');
  const { setPlayerName, setScreen } = useGameStore();

  const handleStart = () => {
    const playerName = name.trim() || '玩家' + Math.floor(Math.random() * 1000);
    setPlayerName(playerName);
    setScreen('lobby');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>♠</Text>
          </View>
          <Text style={styles.title}>帽子21点</Text>
          <Text style={styles.subtitle}>Blackjack</Text>
        </View>

        {/* 功能 */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🤖</Text>
            <Text style={styles.featureLabel}>人机</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚔️</Text>
            <Text style={styles.featureLabel}>对战</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎰</Text>
            <Text style={styles.featureLabel}>下注</Text>
          </View>
        </View>

        {/* 输入 */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="输入昵称"
            placeholderTextColor="#b8b3ad"
            value={name}
            onChangeText={setName}
            maxLength={10}
            onSubmitEditing={handleStart}
          />
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>开始游戏</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>起始筹码 1000</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#faf9f7',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 24,
  },
  logoArea: {
    alignItems: 'center',
    gap: 6,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#f0ece6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoIcon: {
    fontSize: 32,
    color: '#8a8580',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#4a4540',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#b8b3ad',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  features: {
    flexDirection: 'row',
    gap: 12,
  },
  featureItem: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebe7e2',
  },
  featureIcon: {
    fontSize: 18,
  },
  featureLabel: {
    fontSize: 11,
    color: '#8a8580',
  },
  inputArea: {
    width: '100%',
    gap: 10,
  },
  input: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#ebe7e2',
    borderRadius: 8,
    fontSize: 16,
    color: '#4a4540',
    outlineStyle: 'none',
  },
  startBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#6b9b6a',
    borderRadius: 8,
    alignItems: 'center',
  },
  startBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footer: {
    fontSize: 12,
    color: '#b8b3ad',
  },
});

export default HomeScreen;
