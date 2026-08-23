/**
 * 帽子21点 - 成就系统路由
 * 获取成就进度、领取成就奖励、自动检测成就完成
 */

const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const { dbAsync } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

// 获取所有成就和用户进度
router.get('/', async (req, res) => {
  try {
    // 获取所有成就
    const achievements = await dbAsync.all(
      'SELECT * FROM achievements ORDER BY requirement_type, requirement_value'
    );

    // 获取用户成就进度
    const userAchievements = await dbAsync.all(
      `SELECT achievement_id, progress, completed, completed_at
       FROM user_achievements WHERE user_id = ?`,
      [req.userId]
    );

    // 获取用户统计数据用于进度计算
    const user = await User.findById(req.userId);

    // 构建成就进度映射
    const progressMap = {};
    userAchievements.forEach(ua => {
      progressMap[ua.achievement_id] = {
        progress: ua.progress,
        completed: ua.completed === 1,
        completedAt: ua.completed_at
      };
    });

    // 计算每个成就的当前进度
    const achievementsWithProgress = await Promise.all(
      achievements.map(async (achievement) => {
        const userProgress = progressMap[achievement.id];
        let currentProgress = userProgress ? userProgress.progress : 0;
        let completed = userProgress ? userProgress.completed : false;

        // 如果没有记录，自动计算当前进度
        if (!userProgress) {
          currentProgress = await calculateProgress(req.userId, achievement, user);
          completed = currentProgress >= achievement.requirement_value;

          // 自动创建或更新进度记录
          await upsertUserAchievement(req.userId, achievement.id, currentProgress, completed);
        }

        return {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          requirementType: achievement.requirement_type,
          requirementValue: achievement.requirement_value,
          rewardChips: achievement.reward_chips,
          currentProgress,
          completed,
          completedAt: userProgress ? userProgress.completedAt : null,
          progressPercentage: Math.min(
            Math.round((currentProgress / achievement.requirement_value) * 100),
            100
          )
        };
      })
    );

    // 分类统计
    const stats = {
      total: achievements.length,
      completed: achievementsWithProgress.filter(a => a.completed).length,
      inProgress: achievementsWithProgress.filter(a => !a.completed && a.currentProgress > 0).length,
      notStarted: achievementsWithProgress.filter(a => a.currentProgress === 0).length,
      totalRewardsEarned: achievementsWithProgress
        .filter(a => a.completed)
        .reduce((sum, a) => sum + a.rewardChips, 0)
    };

    // 按类型分组
    const grouped = {
      games: achievementsWithProgress.filter(a => a.requirementType === 'games_played'),
      wins: achievementsWithProgress.filter(a => a.requirementType === 'games_won'),
      chips: achievementsWithProgress.filter(a => a.requirementType === 'chips_total'),
      streak: achievementsWithProgress.filter(a => a.requirementType === 'streak'),
      blackjack: achievementsWithProgress.filter(a => a.requirementType === 'blackjack'),
      level: achievementsWithProgress.filter(a => a.requirementType === 'level')
    };

    res.json({
      achievements: achievementsWithProgress,
      grouped,
      stats
    });
  } catch (error) {
    console.error('获取成就列表错误:', error);
    res.status(500).json({ error: '获取成就列表失败' });
  }
});

// 领取成就奖励
router.post('/claim', async (req, res) => {
  try {
    const { achievementId } = req.body;

    if (!achievementId) {
      return res.status(400).json({ error: '请提供成就ID' });
    }

    // 获取成就信息
    const achievement = await dbAsync.get(
      'SELECT * FROM achievements WHERE id = ?',
      [achievementId]
    );

    if (!achievement) {
      return res.status(404).json({ error: '成就不存在' });
    }

    // 获取用户成就进度
    const userAchievement = await dbAsync.get(
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [req.userId, achievementId]
    );

    // 如果不存在记录，先计算进度
    if (!userAchievement) {
      const user = await User.findById(req.userId);
      const progress = await calculateProgress(req.userId, achievement, user);

      if (progress < achievement.requirement_value) {
        return res.status(400).json({
          error: '成就尚未完成',
          currentProgress: progress,
          required: achievement.requirement_value
        });
      }

      // 创建已完成记录但不发放奖励（需要手动领取）
      await dbAsync.run(
        `INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)`,
        [req.userId, achievementId, progress]
      );

      return res.status(400).json({
        error: '请先刷新成就列表查看进度',
        message: '成就已完成，请重新获取成就信息后再领取奖励'
      });
    }

    // 检查是否已完成
    if (userAchievement.progress < achievement.requirement_value) {
      return res.status(400).json({
        error: '成就尚未完成',
        currentProgress: userAchievement.progress,
        required: achievement.requirement_value,
        progressPercentage: Math.round((userAchievement.progress / achievement.requirement_value) * 100)
      });
    }

    // 检查是否已经领取过奖励
    if (userAchievement.completed === 1 && userAchievement.completed_at) {
      // 检查是否有奖励记录（通过额外字段判断是否已领取）
      const claimedRecord = await dbAsync.get(
        `SELECT * FROM achievement_rewards
         WHERE user_id = ? AND achievement_id = ?`,
        [req.userId, achievementId]
      );

      if (claimedRecord) {
        return res.status(400).json({ error: '奖励已领取' });
      }
    }

    // 发放奖励
    await User.updateChips(req.userId, achievement.reward_chips);

    // 记录奖励已领取
    await ensureRewardTable();
    await dbAsync.run(
      `INSERT INTO achievement_rewards (user_id, achievement_id, chips_reward)
       VALUES (?, ?, ?)`,
      [req.userId, achievementId, achievement.reward_chips]
    );

    // 更新成就状态为已领取
    await dbAsync.run(
      `UPDATE user_achievements SET completed = 1, completed_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND achievement_id = ?`,
      [req.userId, achievementId]
    );

    // 获取用户最新筹码
    const user = await User.findById(req.userId);

    res.json({
      message: '奖励领取成功',
      reward: {
        achievementId: achievement.id,
        achievementName: achievement.name,
        achievementIcon: achievement.icon,
        chipsReward: achievement.reward_chips,
        currentChips: user.chips
      }
    });
  } catch (error) {
    console.error('领取成就奖励错误:', error);
    res.status(500).json({ error: '领取成就奖励失败' });
  }
});

// 检查并更新成就进度（可由游戏结束后调用）
router.post('/check', async (req, res) => {
  try {
    const newAchievements = await checkAndUpdateAchievements(req.userId);

    res.json({
      message: '成就检查完成',
      newCompleted: newAchievements,
      count: newAchievements.length
    });
  } catch (error) {
    console.error('检查成就错误:', error);
    res.status(500).json({ error: '检查成就失败' });
  }
});

// 辅助函数：计算成就进度
async function calculateProgress(userId, achievement, user) {
  switch (achievement.requirement_type) {
    case 'games_played':
      return user.games_played || 0;

    case 'games_won':
      return user.games_won || 0;

    case 'chips_total':
      return user.chips || 0;

    case 'streak':
      return await getCurrentWinStreak(userId);

    case 'blackjack':
      const blackjackCount = await dbAsync.get(
        `SELECT COUNT(*) as count FROM game_history
         WHERE user_id = ? AND result = 'blackjack'`,
        [userId]
      );
      return blackjackCount.count || 0;

    case 'level':
      return user.level || 1;

    default:
      return 0;
  }
}

// 辅助函数：获取当前连胜
async function getCurrentWinStreak(userId) {
  const games = await dbAsync.all(
    `SELECT result FROM game_history
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  let streak = 0;
  for (const game of games) {
    if (game.result === 'win' || game.result === 'blackjack') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// 辅助函数：获取最长连胜
async function getMaxWinStreak(userId) {
  const games = await dbAsync.all(
    `SELECT result FROM game_history
     WHERE user_id = ?
     ORDER BY created_at ASC`,
    [userId]
  );

  let maxStreak = 0;
  let currentStreak = 0;

  for (const game of games) {
    if (game.result === 'win' || game.result === 'blackjack') {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }
  return maxStreak;
}

// 辅助函数：更新或创建用户成就记录
async function upsertUserAchievement(userId, achievementId, progress, completed) {
  await dbAsync.run(
    `INSERT OR REPLACE INTO user_achievements
     (user_id, achievement_id, progress, completed, completed_at)
     VALUES (?, ?, ?, ?, ${completed ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
    [userId, achievementId, progress, completed ? 1 : 0]
  );
}

// 辅助函数：检查并更新所有成就
async function checkAndUpdateAchievements(userId) {
  const user = await User.findById(userId);
  const achievements = await dbAsync.all('SELECT * FROM achievements');
  const newCompleted = [];

  for (const achievement of achievements) {
    const progress = await calculateProgress(userId, achievement, user);

    const existing = await dbAsync.get(
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [userId, achievement.id]
    );

    const wasCompleted = existing ? existing.completed === 1 : false;
    const isCompleted = progress >= achievement.requirement_value;

    await upsertUserAchievement(userId, achievement.id, progress, isCompleted);

    // 新完成的成就
    if (isCompleted && !wasCompleted) {
      newCompleted.push({
        id: achievement.id,
        name: achievement.name,
        icon: achievement.icon,
        rewardChips: achievement.reward_chips
      });
    }
  }

  return newCompleted;
}

// 辅助函数：确保奖励记录表存在
async function ensureRewardTable() {
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS achievement_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      chips_reward INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id),
      UNIQUE(user_id, achievement_id)
    )
  `);
}

module.exports = router;
