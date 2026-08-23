/**
 * 帽子21点 - 用户路由
 * 排行榜、游戏历史、个人资料等
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// 获取排行榜
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const leaderboard = await User.getLeaderboard(Math.min(limit, 200));

    res.json({
      leaderboard: leaderboard.map((user, index) => ({
        rank: index + 1,
        id: user.id,
        username: user.username,
        chips: user.chips,
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        level: user.level
      }))
    });
  } catch (error) {
    console.error('获取排行榜错误:', error);
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

// 获取游戏历史
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await User.getGameHistory(req.userId, Math.min(limit, 100));

    res.json({ history });
  } catch (error) {
    console.error('获取游戏历史错误:', error);
    res.status(500).json({ error: '获取游戏历史失败' });
  }
});

// 获取用户统计
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await User.getUserStats(req.userId);
    res.json({ stats });
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({ error: '获取用户统计失败' });
  }
});

// 获取在线用户
router.get('/online', async (req, res) => {
  try {
    const users = await User.getOnlineUsers();
    res.json({ users, count: users.length });
  } catch (error) {
    console.error('获取在线用户错误:', error);
    res.status(500).json({ error: '获取在线用户失败' });
  }
});

// 更新用户资料
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.updateProfile(req.userId, req.body);
    res.json({ user });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({ error: '更新用户资料失败' });
  }
});

module.exports = router;
