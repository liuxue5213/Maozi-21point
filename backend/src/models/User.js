/**
 * 帽子21点 - 用户数据模型
 * 新增：道具系统、每日任务、破产保护
 */

const { dbAsync } = require('../database/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// 道具类型定义
const ITEM_TYPES = {
  hint: { name: '提示卡', icon: '💡', price: 100 },
  double: { name: '双倍卡', icon: '💰', price: 300 },
  revive: { name: '复活卡', icon: '🔄', price: 500 },
  insurance: { name: '保险卡', icon: '🛡️', price: 200 },
  lucky: { name: '幸运卡', icon: '🍀', price: 400 }
};

// 每日任务定义
const DAILY_TASKS = [
  { id: 'play_3', name: '每日游戏', description: '完成3局游戏', type: 'play_game', target: 3, reward: 200 },
  { id: 'win_2', name: '每日胜利', description: '赢得2局游戏', type: 'win_game', target: 2, reward: 300 },
  { id: 'get_blackjack', name: '黑杰克大师', description: '获得1次Blackjack', type: 'get_blackjack', target: 1, reward: 500 },
  { id: 'play_10', name: '勤奋玩家', description: '完成10局游戏', type: 'play_game', target: 10, reward: 1000 },
  { id: 'win_5', name: '连胜将军', description: '赢得5局游戏', type: 'win_game', target: 5, reward: 800 }
];

class User {
  // ============ 基础用户操作 ============

  // 创建用户
  static async create(username, password) {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await dbAsync.run(
      `INSERT INTO users (id, username, password_hash, chips) VALUES (?, ?, ?, 1000)`,
      [id, username, passwordHash]
    );

    // 初始化用户道具
    await this.initUserItems(id);

    return { id, username, chips: 1000 };
  }

  // 通过用户名查找用户
  static async findByUsername(username) {
    return await dbAsync.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
  }

  // 通过ID查找用户
  static async findById(id) {
    return await dbAsync.get(
      'SELECT id, username, chips, avatar, level, experience, games_played, games_won, total_winnings, status, role, created_at, last_login FROM users WHERE id = ?',
      [id]
    );
  }

  // 验证密码
  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  // 更新筹码
  static async updateChips(userId, amount) {
    await dbAsync.run(
      'UPDATE users SET chips = chips + ? WHERE id = ?',
      [amount, userId]
    );
  }

  // 设置筹码
  static async setChips(userId, amount) {
    await dbAsync.run(
      'UPDATE users SET chips = ? WHERE id = ?',
      [amount, userId]
    );
  }

  // 更新游戏统计
  static async updateGameStats(userId, result, chipsChange) {
    const updates = ['games_played = games_played + 1'];

    if (result === 'win' || result === 'blackjack') {
      updates.push('games_won = games_won + 1');
      updates.push(`total_winnings = total_winnings + ${chipsChange}`);
    }

    // 更新等级和经验
    const user = await this.findById(userId);
    const newExp = (user.experience || 0) + 10;
    const newLevel = Math.floor(newExp / 100) + 1;

    updates.push(`experience = ${newExp}`);
    updates.push(`level = ${newLevel}`);

    await dbAsync.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      [userId]
    );
  }

  // 更新最后登录时间
  static async updateLastLogin(userId) {
    await dbAsync.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  // 更新用户资料
  static async updateProfile(userId, data) {
    const allowedFields = ['avatar'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length > 0) {
      values.push(userId);
      await dbAsync.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    return this.findById(userId);
  }

  // 获取排行榜
  static async getLeaderboard(limit = 100) {
    return await dbAsync.all(
      `SELECT id, username, chips, games_played, games_won, level
       FROM users
       WHERE status = 'active'
       ORDER BY chips DESC
       LIMIT ?`,
      [limit]
    );
  }

  // 获取用户游戏历史
  static async getGameHistory(userId, limit = 50) {
    return await dbAsync.all(
      `SELECT * FROM game_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
  }

  // 添加游戏历史
  static async addGameHistory(userId, gameData) {
    const { gameMode, result, chipsChange, opponentName, duration } = gameData;

    await dbAsync.run(
      `INSERT INTO game_history (user_id, game_mode, result, chips_change, opponent_name, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, gameMode, result, chipsChange, opponentName, duration]
    );
  }

  // 获取在线用户
  static async getOnlineUsers() {
    return await dbAsync.all(
      `SELECT id, username, chips, level FROM users
       WHERE status = 'active' AND last_login > datetime('now', '-1 hour')
       ORDER BY last_login DESC`
    );
  }

  // 获取用户统计
  static async getUserStats(userId) {
    const user = await this.findById(userId);
    if (!user) return null;

    const totalGames = user.games_played || 0;
    const winRate = totalGames > 0 ? ((user.games_won || 0) / totalGames * 100).toFixed(1) : 0;

    return {
      ...user,
      winRate: `${winRate}%`,
      totalGames
    };
  }

  // ============ 道具系统 ============

  // 初始化用户道具（新用户赠送道具）
  static async initUserItems(userId) {
    const defaultItems = [
      { type: 'hint', count: 3 },
      { type: 'double', count: 1 },
      { type: 'revive', count: 1 },
      { type: 'insurance', count: 2 },
      { type: 'lucky', count: 1 }
    ];

    for (const item of defaultItems) {
      await dbAsync.run(
        `INSERT OR IGNORE INTO user_items (user_id, item_type, count) VALUES (?, ?, ?)`,
        [userId, item.type, item.count]
      );
    }
  }

  // 获取用户道具库存
  static async getUserItems(userId) {
    const rows = await dbAsync.all(
      'SELECT item_type, count FROM user_items WHERE user_id = ?',
      [userId]
    );

    const items = {};
    rows.forEach(row => {
      items[row.item_type] = row.count;
    });

    return items;
  }

  // 更新用户道具数量
  static async updateUserItem(userId, itemType, delta) {
    await dbAsync.run(
      `UPDATE user_items SET count = count + ? WHERE user_id = ? AND item_type = ?`,
      [delta, userId, itemType]
    );
  }

  // 添加道具给用户
  static async addItem(userId, itemType, count = 1) {
    // 检查是否已有该道具
    const existing = await dbAsync.get(
      'SELECT count FROM user_items WHERE user_id = ? AND item_type = ?',
      [userId, itemType]
    );

    if (existing) {
      await dbAsync.run(
        'UPDATE user_items SET count = count + ? WHERE user_id = ? AND item_type = ?',
        [count, userId, itemType]
      );
    } else {
      await dbAsync.run(
        'INSERT INTO user_items (user_id, item_type, count) VALUES (?, ?, ?)',
        [userId, itemType, count]
      );
    }
  }

  // 购买道具
  static async buyItem(userId, itemType, quantity = 1) {
    const item = ITEM_TYPES[itemType];
    if (!item) {
      return { success: false, message: '未知道具类型' };
    }

    const totalPrice = item.price * quantity;
    const user = await this.findById(userId);

    if (!user || user.chips < totalPrice) {
      return { success: false, message: '筹码不足' };
    }

    // 扣除筹码
    await dbAsync.run(
      'UPDATE users SET chips = chips - ? WHERE id = ?',
      [totalPrice, userId]
    );

    // 添加道具
    await this.addItem(userId, itemType, quantity);

    // 获取更新后的用户信息
    const updatedUser = await this.findById(userId);
    const items = await this.getUserItems(userId);

    return {
      success: true,
      message: `成功购买 ${item.name} x${quantity}`,
      chips: updatedUser.chips,
      items
    };
  }

  // ============ 每日任务系统 ============

  // 获取用户每日任务
  static async getDailyTasks(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // 检查并初始化今日任务
    await this.initDailyTasks(userId, today);

    const tasks = await dbAsync.all(
      `SELECT dt.id, dt.task_id, dt.progress, dt.completed, dt.claimed,
              t.name, t.description, t.type, t.target, t.reward
       FROM daily_tasks dt
       JOIN daily_tasks_def t ON dt.task_id = t.id
       WHERE dt.user_id = ? AND dt.task_date = ?
       ORDER BY t.target ASC`,
      [userId, today]
    );

    return tasks.map(task => ({
      id: task.id,
      taskId: task.task_id,
      name: task.name,
      description: task.description,
      type: task.type,
      target: task.target,
      progress: task.progress,
      reward: task.reward,
      completed: task.completed === 1,
      claimed: task.claimed === 1
    }));
  }

  // 初始化每日任务
  static async initDailyTasks(userId, date) {
    for (const task of DAILY_TASKS) {
      await dbAsync.run(
        `INSERT OR IGNORE INTO daily_tasks (user_id, task_id, task_date, progress, completed, claimed)
         VALUES (?, ?, ?, 0, 0, 0)`,
        [userId, task.id, date]
      );
    }
  }

  // 更新每日任务进度
  static async updateDailyTaskProgress(userId, taskType, increment = 1) {
    const today = new Date().toISOString().split('T')[0];
    await this.initDailyTasks(userId, today);

    await dbAsync.run(
      `UPDATE daily_tasks 
       SET progress = progress + ?,
           completed = CASE WHEN progress + ? >= (SELECT target FROM daily_tasks_def WHERE type = ? LIMIT 1) THEN 1 ELSE completed END
       WHERE user_id = ? AND task_date = ? AND task_id IN (SELECT id FROM daily_tasks_def WHERE type = ?)`,
      [increment, increment, taskType, userId, today, taskType]
    );
  }

  // 领取任务奖励
  static async claimTaskReward(userId, taskId) {
    const today = new Date().toISOString().split('T')[0];

    const task = await dbAsync.get(
      `SELECT dt.*, t.reward, t.name
       FROM daily_tasks dt
       JOIN daily_tasks_def t ON dt.task_id = t.id
       WHERE dt.id = ? AND dt.user_id = ? AND dt.task_date = ?`,
      [taskId, userId, today]
    );

    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    if (!task.completed) {
      return { success: false, message: '任务尚未完成' };
    }

    if (task.claimed) {
      return { success: false, message: '奖励已领取' };
    }

    // 发放奖励
    await dbAsync.run(
      'UPDATE users SET chips = chips + ? WHERE id = ?',
      [task.reward, userId]
    );

    // 标记已领取
    await dbAsync.run(
      'UPDATE daily_tasks SET claimed = 1 WHERE id = ?',
      [taskId]
    );

    const user = await this.findById(userId);
    return {
      success: true,
      message: `获得 ${task.reward} 筹码`,
      chips: user.chips,
      reward: task.reward
    };
  }

  // ============ 破产保护系统 ============

  // 检查是否可以领取破产保护
  static async checkBankruptcyProtection(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const claim = await dbAsync.get(
      `SELECT * FROM bankruptcy_protection 
       WHERE user_id = ? AND claim_date = ?`,
      [userId, today]
    );

    // 今天还没有领取过
    return !claim;
  }

  // 记录破产保护领取
  static async recordBankruptcyClaim(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    await dbAsync.run(
      `INSERT OR IGNORE INTO bankruptcy_protection (user_id, claim_date, amount)
       VALUES (?, ?, 1000)`,
      [userId, today]
    );
  }

  // 获取商店物品列表
  static async getShopItems() {
    return Object.entries(ITEM_TYPES).map(([key, item]) => ({
      type: key,
      name: item.name,
      icon: item.icon,
      price: item.price,
      description: this.getItemDescription(key)
    }));
  }

  // 获取道具描述
  static getItemDescription(itemType) {
    const descriptions = {
      hint: '提示最佳操作，助你做出正确决策',
      double: '本局获胜时筹码翻倍',
      revive: '筹码归零时自动使用，恢复500筹码',
      insurance: '庄家Blackjack时返还50%下注',
      lucky: '本局Blackjack赔付提升至3:2'
    };
    return descriptions[itemType] || '';
  }

  // ============ 每日免费道具领取 ============

  // 检查今日是否已领取免费道具
  static async checkDailyFreeClaim(userId, date) {
    const claim = await dbAsync.get(
      'SELECT * FROM daily_free_claims WHERE user_id = ? AND claim_date = ?',
      [userId, date]
    );
    return !!claim;
  }

  // 记录每日免费道具领取
  static async recordDailyFreeClaim(userId, date) {
    await dbAsync.run(
      'INSERT OR IGNORE INTO daily_free_claims (user_id, claim_date) VALUES (?, ?)',
      [userId, date]
    );
  }
}

module.exports = { User, ITEM_TYPES, DAILY_TASKS };
