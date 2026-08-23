import { toast } from "../utils/toast";
/**
 * 帽子21点 - 登录/注册界面
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from '../rnw';
import useGameStore from '../store/gameStore';

const showAlert = (title, message) => {
  toast.info(`${title}: ${message}`);
};

const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useGameStore();

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      showAlert('提示', '请输入用户名和密码');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      showAlert('提示', '两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('错误', data.error || '操作失败');
        return;
      }

      // 保存token和用户信息
      login(data.token, data.user);

      showAlert('成功', isLogin ? '登录成功！' : '注册成功！', [
        { text: '确定', onPress: () => onAuthSuccess && onAuthSuccess() }
      ]);
    } catch (error) {
      showAlert('错误', '网络错误，请稍后重试');
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
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

        {/* 切换登录/注册 */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.tabActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>登录</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.tabActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>注册</Text>
          </TouchableOpacity>
        </View>

        {/* 表单 */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="用户名 (3-20个字符)"
            placeholderTextColor="#b8b3ad"
            value={username}
            onChangeText={setUsername}
            maxLength={20}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="密码 (至少6个字符)"
            placeholderTextColor="#b8b3ad"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="确认密码"
              placeholderTextColor="#b8b3ad"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? '处理中...' : (isLogin ? '登 录' : '注 册')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          {isLogin ? '登录后积分将自动保存' : '注册即送1000筹码'}
        </Text>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f0ece6',
    borderRadius: 8,
    padding: 4,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 14,
    color: '#8a8580',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#4a4540',
    fontWeight: '600',
  },
  form: {
    width: '100%',
    gap: 12,
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
  submitBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#6b9b6a',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  hint: {
    fontSize: 12,
    color: '#b8b3ad',
  },
});

export default AuthScreen;
