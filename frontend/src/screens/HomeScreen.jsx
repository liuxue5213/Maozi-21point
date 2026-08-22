/**
 * 帽子21点 - 首页/登录页 (React Native Web)
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from '../rnw';
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
          <Text style={styles.logoIcon}>🎩</Text>
          <Text style={styles.title}>帽子21点</Text>
          <Text style={styles.subtitle}>经典扑克 · 策略对战</Text>
        </View>

        {/* 功能特点 */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🤖</Text>
            <Text style={styles.featureText}>人机对战</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>⚔️</Text>
            <Text style={styles.featureText}>1V1匹配</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureText}>策略下注</Text>
          </View>
        </View>

        {/* 输入区域 */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="请输入你的昵称"
            value={name}
            onChangeText={setName}
            maxLength={10}
            onSubmitEditing={handleStart}
          />
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>开始游戏</Text>
          </TouchableOpacity>
        </View>

        {/* 规则说明 */}
        <View style={styles.rules}>
          <Text style={styles.ruleText}>🎯 目标：点数接近21点但不超过</Text>
          <Text style={styles.ruleText}>💵 初始金币：1000分</Text>
          <Text style={styles.ruleText}>🎲 操作：下注、跟注、加注、梭哈</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 24,
  },
  logoArea: {
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 72,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  features: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    width: '100%',
  },
  feature: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  inputArea: {
    width: '100%',
    gap: 12,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: 'white',
    outlineStyle: 'none',
  },
  startBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  startBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  rules: {
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  ruleText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 2,
  },
});

export default HomeScreen;
