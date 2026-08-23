/**
 * 帽子21点 - 认证路由
 * 用户注册、登录、获取当前用户信息
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authMiddleware } = require('../middleware/auth');

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应为3-20个字符' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6个字符' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 创建用户
    const user = await User.create(username, password);

    // 生成Token
    const token = generateToken({ ...user, role: 'user' });

    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        chips: user.chips
      },
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 检查用户状态
    if (user.status === 'banned') {
      return res.status(403).json({ error: '账号已被封禁' });
    }

    // 验证密码
    const isValid = await User.verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await User.updateLastLogin(user.id);

    // 生成Token
    const token = generateToken(user);

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        chips: user.chips,
        level: user.level,
        gamesPlayed: user.games_played,
        gamesWon: user.games_won
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

module.exports = router;
