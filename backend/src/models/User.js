/**
 * 帽子21点 - 用户数据模型
 */

const { dbAsync } = require('../database/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class User {
  // 创建用户
  static async create(username, password) {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await dbAsync.run(
      `INSERT INTO users (id, username, password_hash, chips) VALUES (?, ?, ?, 1000)`,
      [id, username, passwordHash]
    );

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
}

module.exports = User;
