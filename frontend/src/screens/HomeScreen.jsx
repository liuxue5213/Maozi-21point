/**
 * 帽子21点 - 首页/登录页 (自然风格)
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
        {/* Logo区域 */}
        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>♠</Text>
          </View>
          <Text style={styles.title}>帽子21点</Text>
          <Text style={styles.subtitle}>Blackjack</Text>
        </View>

        {/* 功能卡片 */}
        <View style={styles.featureRow}>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🤖</Text>
            <Text style={styles.featureLabel}>人机</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>⚔️</Text>
            <Text style={styles.featureLabel}>对战</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🎰</Text>
            <Text style={styles.featureLabel}>下注</Text>
          </View>
        </View>

        {/* 输入区域 */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="输入你的昵称"
            placeholderTextColor="#a89f94"
            value={name}
            onChangeText={setName}
            maxLength={10}
            onSubmitEditing={handleStart}
          />
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>开始</Text>
          </TouchableOpacity>
        </View>

        {/* 底部信息 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>起始筹码 1000 · 经典21点规则</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f5f3f0',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 28,
  },
  logoArea: {
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#2c2418',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoEmoji: {
    fontSize: 36,
    color: '#f5f3f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c2418',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#a89f94',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  featureRow: {
    flexDirection: 'row',
    gap: 16,
  },
  featureItem: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e2d8',
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureLabel: {
    fontSize: 12,
    color: '#7a7068',
    fontWeight: '500',
  },
  inputArea: {
    width: '100%',
    gap: 12,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e8e2d8',
    borderRadius: 10,
    fontSize: 16,
    color: '#2c2418',
    outlineStyle: 'none',
  },
  startBtn: {
    width: '100%',
    paddingVertical: 15,
    backgroundColor: '#5b8c5a',
    borderRadius: 10,
    alignItems: 'center',
  },
  startBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  footer: {
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#a89f94',
    letterSpacing: 0.5,
  },
});

export default HomeScreen;
