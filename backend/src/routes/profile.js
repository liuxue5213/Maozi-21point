/**
 * 帽子21点 - 个人统计和历史记录路由
 * 胜率、总局数、连胜等统计信息
 */

const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const { dbAsync } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

// 获取个人统计（胜率、总局数、连胜等）
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const totalGames = user.games_played || 0;
    const totalWins = user.games_won || 0;
    const totalLosses = totalGames - totalWins; // 简化计算
    const totalDraws = 0; // 暂时设为0
    const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : 0;

    // 计算最长连胜和当前连胜
    const winStreak = await calculateWinStreak(req.userId);

    // 获取最近30天活跃度
    const recentActivity = await dbAsync.all(
      `SELECT DATE(created_at) as date, COUNT(*) as games
       FROM game_history
       WHERE user_id = ? AND created_at > datetime('now', '-30 days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [req.userId]
    );

    // 获取筹码变化趋势
    const chipHistory = await dbAsync.all(
      `SELECT SUM(chips_change) as daily_chips, DATE(created_at) as date
       FROM game_history
       WHERE user_id = ? AND created_at > datetime('now', '-7 days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [req.userId]
    );

    res.json({
      profile: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        chips: user.chips,
        level: user.level,
        exp: user.experience,
        stats: {
          gamesPlayed: totalGames,
          gamesWon: totalWins,
          gamesLost: totalLosses,
          gamesDraw: totalDraws,
          winRate: `${winRate}%`,
          totalChipsWon: user.total_winnings || 0,
          currentStreak: winStreak.current,
          maxStreak: winStreak.max,
          levelProgress: `${user.experience % 100}/100`
        },
        recentActivity,
        chipHistory,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('获取个人统计错误:', error);
    res.status(500).json({ error: '获取个人统计失败' });
  }
});

// 获取游戏历史记录
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const result = req.query.result; // win, lose, draw

    let whereClause = 'WHERE user_id = ?';
    const params = [req.userId];

    if (result && ['win', 'lose', 'draw', 'blackjack'].includes(result)) {
      whereClause += ' AND result = ?';
      params.push(result);
    }

    // 获取总记录数
    const countResult = await dbAsync.get(
      `SELECT COUNT(*) as total FROM game_history ${whereClause}`,
      params
    );

    // 获取分页数据
    const history = await dbAsync.all(
      `SELECT id, game_mode, result, chips_change, opponent_name, duration_seconds, created_at
       FROM game_history
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 汇总统计
    const summary = await dbAsync.get(
      `SELECT
         COUNT(*) as totalGames,
         SUM(CASE WHEN result IN ('win', 'blackjack') THEN 1 ELSE 0 END) as totalWins,
         SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as totalLosses,
         SUM(chips_change) as netChips,
         MAX(chips_change) as bestWin,
         MIN(chips_change) as worstLoss
       FROM game_history
       WHERE user_id = ?`,
      [req.userId]
    );

    res.json({
      history: history.map(h => ({
        id: h.id,
        mode: h.game_mode,
        result: h.result,
        chipsChange: h.chips_change,
        opponent: h.opponent_name,
        duration: h.duration_seconds,
        date: h.created_at
      })),
      summary: {
        totalGames: summary.totalGames || 0,
        totalWins: summary.totalWins || 0,
        totalLosses: summary.totalLosses || 0,
        netChips: summary.netChips || 0,
        bestWin: summary.bestWin || 0,
        worstLoss: summary.worstLoss || 0
      },
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('获取游戏历史错误:', error);
    res.status(500).json({ error: '获取游戏历史失败' });
  }
});

// 更新用户资料
router.put('/', async (req, res) => {
  try {
    const { avatar, username } = req.body;

    // 如果修改用户名，验证唯一性
    if (username) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: '用户名长度应为3-20个字符' });
      }

      const existingUser = await User.findByUsername(username);
      if (existingUser && existingUser.id !== req.userId) {
        return res.status(400).json({ error: '用户名已被使用' });
      }

      await dbAsync.run(
        'UPDATE users SET username = ? WHERE id = ?',
        [username, req.userId]
      );
    }

    // 更新头像
    if (avatar) {
      await dbAsync.run(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatar, req.userId]
      );
    }

    // 获取更新后的用户信息
    const user = await User.findById(req.userId);

    res.json({
      message: '资料更新成功',
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        chips: user.chips,
        level: user.level
      }
    });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({ error: '更新用户资料失败' });
  }
});

// 辅助函数：计算连胜
async function calculateWinStreak(userId) {
  try {
    const games = await dbAsync.all(
      `SELECT result FROM game_history
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < games.length; i++) {
      if (games[i].result === 'win' || games[i].result === 'blackjack') {
        tempStreak++;
        if (i === 0 || currentStreak > 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > maxStreak) {
          maxStreak = tempStreak;
        }
        tempStreak = 0;
        if (i === 0) {
          currentStreak = 0;
        }
      }
    }

    if (tempStreak > maxStreak) {
      maxStreak = tempStreak;
    }

    return { current: currentStreak, max: maxStreak };
  } catch {
    return { current: 0, max: 0 };
  }
}

module.exports = router;
