/**
 * 帽子21点 - 每日签到路由
 * 签到领取奖励、连续签到额外奖励
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { dbAsync } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// 签到表初始化SQL（首次使用时创建表）
const CHECKIN_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    checkin_date DATE NOT NULL,
    chips_reward INTEGER NOT NULL,
    streak_day INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, checkin_date)
  )
`;

// 确保签到表存在
async function ensureCheckinTable() {
  await dbAsync.run(CHECKIN_TABLE_SQL);
}

// 所有路由都需要认证
router.use(authMiddleware);

// 每日签到领取奖励
router.post('/', async (req, res) => {
  try {
    await ensureCheckinTable();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const now = new Date();

    // 检查今天是否已签到
    const existingCheckin = await dbAsync.get(
      'SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?',
      [req.userId, today]
    );

    if (existingCheckin) {
      return res.status(400).json({
        error: '今天已经签到过了',
        nextCheckin: getNextCheckinTime(now)
      });
    }

    // 计算连续签到天数
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const lastCheckin = await dbAsync.get(
      'SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?',
      [req.userId, yesterdayStr]
    );

    let streakDay = 1;
    if (lastCheckin) {
      streakDay = lastCheckin.streak_day + 1;
    }

    // 计算奖励：基础50-200随机筹码，连续7天额外奖励
    let baseReward = Math.floor(Math.random() * 151) + 50; // 50-200
    let bonusReward = 0;
    let bonusMessage = '';

    // 连续7天额外奖励
    if (streakDay % 7 === 0) {
      bonusReward = 500;
      bonusMessage = `连续签到${streakDay}天，额外奖励500筹码！`;
    } else if (streakDay % 3 === 0) {
      bonusReward = 100;
      bonusMessage = `连续签到${streakDay}天，额外奖励100筹码！`;
    }

    const totalReward = baseReward + bonusReward;

    // 记录签到
    await dbAsync.run(
      'INSERT INTO checkins (user_id, checkin_date, chips_reward, streak_day) VALUES (?, ?, ?, ?)',
      [req.userId, today, totalReward, streakDay]
    );

    // 发放奖励
    await User.updateChips(req.userId, totalReward);

    // 获取用户最新筹码
    const user = await User.findById(req.userId);

    // 计算下次签到时间
    const nextCheckin = getNextCheckinTime(now);

    res.json({
      message: '签到成功',
      checkin: {
        date: today,
        streakDay,
        baseReward,
        bonusReward,
        totalReward,
        bonusMessage,
        currentChips: user.chips,
        nextCheckin
      }
    });
  } catch (error) {
    console.error('签到错误:', error);
    res.status(500).json({ error: '签到失败，请稍后重试' });
  }
});

// 检查签到状态
router.get('/status', async (req, res) => {
  try {
    await ensureCheckinTable();

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // 检查今天是否已签到
    const todayCheckin = await dbAsync.get(
      'SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?',
      [req.userId, today]
    );

    // 计算当前连续签到天数
    let currentStreak = 0;
    if (todayCheckin) {
      currentStreak = todayCheckin.streak_day;
    } else {
      // 检查昨天是否签到，确定当前连续天数
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayCheckin = await dbAsync.get(
        'SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?',
        [req.userId, yesterdayStr]
      );

      if (yesterdayCheckin) {
        currentStreak = yesterdayCheckin.streak_day;
      }
    }

    // 获取最近7天签到记录
    const recentCheckins = await dbAsync.all(
      `SELECT checkin_date, chips_reward, streak_day
       FROM checkins
       WHERE user_id = ? AND checkin_date > date('now', '-7 days')
       ORDER BY checkin_date DESC`,
      [req.userId]
    );

    // 获取本月签到统计
    const monthlyStats = await dbAsync.get(
      `SELECT
         COUNT(*) as totalDays,
         SUM(chips_reward) as totalChips,
         MAX(streak_day) as maxStreak
       FROM checkins
       WHERE user_id = ? AND strftime('%Y-%m', checkin_date) = strftime('%Y-%m', 'now')`,
      [req.userId]
    );

    // 计算距离下次额外奖励
    const daysToNextBonus = 7 - (currentStreak % 7);

    res.json({
      status: {
        checkedToday: !!todayCheckin,
        currentStreak,
        daysToNextBonus: daysToNextBonus === 7 ? 0 : daysToNextBonus,
        nextBonusDay: 7,
        nextCheckin: todayCheckin ? getNextCheckinTime(now) : '现在可以签到',
        recentCheckins: recentCheckins.map(c => ({
          date: c.checkin_date,
          reward: c.chips_reward,
          streakDay: c.streak_day
        })),
        monthlyStats: {
          totalDays: monthlyStats.totalDays || 0,
          totalChips: monthlyStats.totalChips || 0,
          maxStreak: monthlyStats.maxStreak || 0
        }
      }
    });
  } catch (error) {
    console.error('检查签到状态错误:', error);
    res.status(500).json({ error: '检查签到状态失败' });
  }
});

// 获取签到日历（本月完整签到记录）
router.get('/calendar', async (req, res) => {
  try {
    await ensureCheckinTable();

    const calendar = await dbAsync.all(
      `SELECT checkin_date, chips_reward, streak_day
       FROM checkins
       WHERE user_id = ? AND strftime('%Y-%m', checkin_date) = strftime('%Y-%m', 'now')
       ORDER BY checkin_date ASC`,
      [req.userId]
    );

    res.json({
      calendar: calendar.map(c => ({
        date: c.checkin_date,
        reward: c.chips_reward,
        streakDay: c.streak_day
      }))
    });
  } catch (error) {
    console.error('获取签到日历错误:', error);
    res.status(500).json({ error: '获取签到日历失败' });
  }
});

// 辅助函数：获取下次签到时间
function getNextCheckinTime(now) {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}小时${minutes}分钟后`;
}

module.exports = router;
