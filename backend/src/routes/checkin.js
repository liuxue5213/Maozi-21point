/**
 * 帽子21点 - 每日签到路由
 * 签到领取奖励、连续签到额外奖励
 */

const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const { dbAsync } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

// ============ 每日任务 ============

// 获取每日任务列表
router.get('/tasks', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 确保任务定义存在
    let taskDefs = await dbAsync.all('SELECT * FROM daily_tasks_def');
    if (taskDefs.length === 0) {
      const defaults = [
        { id: 'play_game', name: '进行对局', type: 'play_game', target: 3, reward: 100 },
        { id: 'win_game', name: '赢得对局', type: 'win_game', target: 2, reward: 200 },
        { id: 'get_blackjack', name: '获得Blackjack', type: 'get_blackjack', target: 1, reward: 300 },
        { id: 'checkin', name: '每日签到', type: 'checkin', target: 1, reward: 50 },
      ];
      for (const d of defaults) {
        await dbAsync.run(
          'INSERT OR IGNORE INTO daily_tasks_def (id, name, type, target, reward) VALUES (?, ?, ?, ?, ?)',
          [d.id, d.name, d.type, d.target, d.reward]
        );
      }
      taskDefs = await dbAsync.all('SELECT * FROM daily_tasks_def');
    }

    const userTasks = await dbAsync.all(
      'SELECT * FROM daily_tasks WHERE user_id = ? AND task_date = ?',
      [req.userId, today]
    );

    const icons = { play_game: '🎮', win_game: '🏆', get_blackjack: '🃏', checkin: '📅' };
    const tasks = taskDefs.map(def => {
      const ut = userTasks.find(t => t.task_id === def.id);
      const progress = ut?.progress || 0;
      return {
        type: def.type,
        name: def.name,
        icon: icons[def.type] || '🎯',
        target: def.target,
        progress,
        reward: def.reward,
        completed: progress >= def.target,
        claimed: Boolean(ut?.claimed)
      };
    });

    res.json({ tasks, date: today });
  } catch (error) {
    console.error('获取每日任务错误:', error);
    res.status(500).json({ error: '获取任务失败' });
  }
});

// 领取任务奖励
router.post('/tasks/claim', async (req, res) => {
  try {
    const { taskType } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const def = await dbAsync.get('SELECT * FROM daily_tasks_def WHERE type = ?', [taskType]);
    if (!def) return res.status(404).json({ error: '任务不存在' });

    const userTask = await dbAsync.get(
      'SELECT * FROM daily_tasks WHERE user_id = ? AND task_id = ? AND task_date = ?',
      [req.userId, def.id, today]
    );

    const progress = userTask?.progress || 0;
    if (progress < def.target) return res.status(400).json({ error: '任务还未完成' });
    if (userTask?.claimed) return res.status(400).json({ error: '奖励已领取' });

    await User.updateChips(req.userId, def.reward);
    if (userTask) {
      await dbAsync.run(
        'UPDATE daily_tasks SET claimed = 1 WHERE user_id = ? AND task_id = ? AND task_date = ?',
        [req.userId, def.id, today]
      );
    } else {
      await dbAsync.run(
        'INSERT INTO daily_tasks (user_id, task_id, task_date, progress, claimed) VALUES (?, ?, ?, ?, 1)',
        [req.userId, def.id, today, progress]
      );
    }

    const user = await User.findById(req.userId);
    res.json({ message: `获得 ${def.reward} 筹码！`, reward: def.reward, chips: user.chips });
  } catch (error) {
    console.error('领取任务奖励错误:', error);
    res.status(500).json({ error: '领取失败' });
  }
});

// 签到表初始化SQL（首次使用时创建表）
const CHECKIN_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    checkin_date DATE NOT NULL,
    reward INTEGER NOT NULL,
    streak INTEGER DEFAULT 1,
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
      streakDay = lastCheckin.streak + 1;
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
      'INSERT INTO checkins (user_id, checkin_date, reward, streak) VALUES (?, ?, ?, ?)',
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
      currentStreak = todayCheckin.streak;
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
        currentStreak = yesterdayCheckin.streak;
      }
    }

    // 获取最近7天签到记录
    const recentCheckins = await dbAsync.all(
      `SELECT checkin_date, reward, streak
       FROM checkins
       WHERE user_id = ? AND checkin_date > date('now', '-7 days')
       ORDER BY checkin_date DESC`,
      [req.userId]
    );

    // 获取本月签到统计
    const monthlyStats = await dbAsync.get(
      `SELECT
         COUNT(*) as totalDays,
         SUM(reward) as totalChips,
         MAX(streak) as maxStreak
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
          reward: c.reward,
          streakDay: c.streak
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
      `SELECT checkin_date, reward, streak
       FROM checkins
       WHERE user_id = ? AND strftime('%Y-%m', checkin_date) = strftime('%Y-%m', 'now')
       ORDER BY checkin_date ASC`,
      [req.userId]
    );

    res.json({
      calendar: calendar.map(c => ({
        date: c.checkin_date,
        reward: c.reward,
        streakDay: c.streak
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
