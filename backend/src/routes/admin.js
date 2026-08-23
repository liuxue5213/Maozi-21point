/**
 * 帽子21点 - 管理后台路由
 * 用户管理、数据统计、公告管理、系统配置
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { dbAsync } = require('../database/db');

// 所有路由需要管理员认证
router.use(authMiddleware, adminMiddleware);

// ============================================================
// 用户管理
// ============================================================

// 获取用户列表（支持分页、搜索、排序）
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const search = req.query.search || '';
    const sort = req.query.sort || 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const status = req.query.status || '';

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(username LIKE ? OR id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 允许的排序字段（防止SQL注入）
    const allowedSortFields = ['created_at', 'chips', 'games_played', 'games_won', 'level', 'last_login', 'username'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';

    // 获取总数
    const countResult = await dbAsync.get(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    // 获取用户列表
    const users = await dbAsync.all(
      `SELECT id, username, chips, avatar, level, games_played, games_won,
              status, role, created_at, last_login
       FROM users
       ${whereClause}
       ORDER BY ${sortField} ${order}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      users,
      pagination: {
        page,
        pageSize,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 获取用户详情
router.get('/users/:id', async (req, res) => {
  try {
    const user = await dbAsync.get(
      `SELECT id, username, chips, avatar, level, experience, games_played, games_won,
              total_winnings, status, role, created_at, last_login
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取用户最近游戏历史
    const recentGames = await dbAsync.all(
      `SELECT * FROM game_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    );

    // 获取用户好友数
    const friendCount = await dbAsync.get(
      `SELECT COUNT(*) as count FROM friendships WHERE user_id = ? AND status = 'accepted'`,
      [req.params.id]
    );

    res.json({
      user,
      recentGames,
      friendCount: friendCount.count
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({ error: '获取用户详情失败' });
  }
});

// 封禁用户
router.put('/users/:id/ban', async (req, res) => {
  try {
    const user = await dbAsync.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: '不能封禁管理员账号' });
    }

    await dbAsync.run(
      "UPDATE users SET status = 'banned' WHERE id = ?",
      [req.params.id]
    );

    // 记录操作日志
    await dbAsync.run(
      'INSERT INTO admin_logs (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)',
      [req.userId, 'ban_user', req.params.id, `封禁用户: ${user.username}`]
    );

    res.json({ message: '用户已封禁' });
  } catch (error) {
    console.error('封禁用户错误:', error);
    res.status(500).json({ error: '封禁用户失败' });
  }
});

// 解封用户
router.put('/users/:id/unban', async (req, res) => {
  try {
    const user = await dbAsync.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await dbAsync.run(
      "UPDATE users SET status = 'active' WHERE id = ?",
      [req.params.id]
    );

    // 记录操作日志
    await dbAsync.run(
      'INSERT INTO admin_logs (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)',
      [req.userId, 'unban_user', req.params.id, `解封用户: ${user.username}`]
    );

    res.json({ message: '用户已解封' });
  } catch (error) {
    console.error('解封用户错误:', error);
    res.status(500).json({ error: '解封用户失败' });
  }
});

// 重置用户筹码
router.put('/users/:id/reset', async (req, res) => {
  try {
    const user = await dbAsync.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const { amount } = req.body;
    const resetAmount = typeof amount === 'number' ? amount : 1000;

    await dbAsync.run(
      'UPDATE users SET chips = ? WHERE id = ?',
      [resetAmount, req.params.id]
    );

    // 记录操作日志
    await dbAsync.run(
      'INSERT INTO admin_logs (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)',
      [req.userId, 'reset_chips', req.params.id, `重置用户 ${user.username} 筹码为 ${resetAmount}`]
    );

    res.json({ message: '筹码已重置', chips: resetAmount });
  } catch (error) {
    console.error('重置筹码错误:', error);
    res.status(500).json({ error: '重置筹码失败' });
  }
});

// 删除用户
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await dbAsync.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: '不能删除管理员账号' });
    }

    // 删除用户关联数据
    await dbAsync.run('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', [req.params.id, req.params.id]);
    await dbAsync.run('DELETE FROM user_achievements WHERE user_id = ?', [req.params.id]);
    await dbAsync.run('DELETE FROM game_history WHERE user_id = ?', [req.params.id]);
    await dbAsync.run('DELETE FROM checkins WHERE user_id = ?', [req.params.id]);
    await dbAsync.run('DELETE FROM users WHERE id = ?', [req.params.id]);

    // 记录操作日志
    await dbAsync.run(
      'INSERT INTO admin_logs (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)',
      [req.userId, 'delete_user', req.params.id, `删除用户: ${user.username}`]
    );

    res.json({ message: '用户已删除' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// ============================================================
// 数据统计
// ============================================================

// 总览数据
router.get('/stats/overview', async (req, res) => {
  try {
    // 总用户数
    const totalUsers = await dbAsync.get('SELECT COUNT(*) as count FROM users');

    // 今日注册
    const todayRegistered = await dbAsync.get(
      "SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')"
    );

    // 在线用户（最近1小时活跃）
    const onlineUsers = await dbAsync.get(
      "SELECT COUNT(*) as count FROM users WHERE last_login > datetime('now', '-1 hour')"
    );

    // 封禁用户数
    const bannedUsers = await dbAsync.get(
      "SELECT COUNT(*) as count FROM users WHERE status = 'banned'"
    );

    // 总筹码
    const totalChips = await dbAsync.get('SELECT SUM(chips) as total FROM users');

    // 总游戏局数
    const totalGames = await dbAsync.get('SELECT COUNT(*) as count FROM game_history');

    res.json({
      totalUsers: totalUsers.count,
      todayRegistered: todayRegistered.count,
      onlineUsers: onlineUsers.count,
      bannedUsers: bannedUsers.count,
      totalChips: totalChips.total || 0,
      totalGames: totalGames.count
    });
  } catch (error) {
    console.error('获取总览数据错误:', error);
    res.status(500).json({ error: '获取总览数据失败' });
  }
});

// 每日统计
router.get('/stats/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // 每日活跃用户（DAU）
    const dau = await dbAsync.all(
      `SELECT DATE(last_login) as date, COUNT(*) as count
       FROM users
       WHERE last_login > datetime('now', '-${days} days')
       GROUP BY DATE(last_login)
       ORDER BY date DESC`
    );

    // 每日游戏局数
    const dailyGames = await dbAsync.all(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM game_history
       WHERE created_at > datetime('now', '-${days} days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    // 每日筹码流通（赢取总额）
    const dailyChips = await dbAsync.all(
      `SELECT DATE(created_at) as date,
              SUM(CASE WHEN chips_change > 0 THEN chips_change ELSE 0 END) as total_winnings,
              SUM(CASE WHEN chips_change < 0 THEN ABS(chips_change) ELSE 0 END) as total_losses
       FROM game_history
       WHERE created_at > datetime('now', '-${days} days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    res.json({
      dau,
      dailyGames,
      dailyChips
    });
  } catch (error) {
    console.error('获取每日统计错误:', error);
    res.status(500).json({ error: '获取每日统计失败' });
  }
});

// 留存率统计
router.get('/stats/retention', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // 计算每日留存率
    const retentionData = await dbAsync.all(
      `
      WITH daily_users AS (
        SELECT DISTINCT user_id, DATE(last_login) as login_date
        FROM users
        WHERE last_login > datetime('now', '-${days + 1} days')
      ),
      first_login AS (
        SELECT user_id, MIN(DATE(created_at)) as first_date
        FROM users
        WHERE created_at > datetime('now', '-${days} days')
        GROUP BY user_id
      )
      SELECT
        f.first_date as cohort_date,
        COUNT(DISTINCT f.user_id) as new_users,
        COUNT(DISTINCT CASE WHEN julianday(d.login_date) - julianday(f.first_date) = 1 THEN d.user_id END) as day1_retained,
        COUNT(DISTINCT CASE WHEN julianday(d.login_date) - julianday(f.first_date) = 3 THEN d.user_id END) as day3_retained,
        COUNT(DISTINCT CASE WHEN julianday(d.login_date) - julianday(f.first_date) = 7 THEN d.user_id END) as day7_retained
      FROM first_login f
      LEFT JOIN daily_users d ON f.user_id = d.user_id
      GROUP BY f.first_date
      ORDER BY f.first_date DESC
      `
    );

    // 格式化留存率
    const formatted = retentionData.map(row => ({
      cohortDate: row.cohort_date,
      newUsers: row.new_users,
      day1Retention: row.new_users > 0 ? ((row.day1_retained / row.new_users) * 100).toFixed(1) : 0,
      day3Retention: row.new_users > 0 ? ((row.day3_retained / row.new_users) * 100).toFixed(1) : 0,
      day7Retention: row.new_users > 0 ? ((row.day7_retained / row.new_users) * 100).toFixed(1) : 0
    }));

    res.json({ retention: formatted });
  } catch (error) {
    console.error('获取留存率错误:', error);
    res.status(500).json({ error: '获取留存率失败' });
  }
});

// ============================================================
// 公告管理
// ============================================================

// 获取公告列表
router.get('/announcements', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const countResult = await dbAsync.get('SELECT COUNT(*) as total FROM announcements');

    const announcements = await dbAsync.all(
      `SELECT a.*, u.username as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    res.json({
      announcements,
      pagination: {
        page,
        pageSize,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    });
  } catch (error) {
    console.error('获取公告列表错误:', error);
    res.status(500).json({ error: '获取公告列表失败' });
  }
});

// 创建公告
router.post('/announcements', async (req, res) => {
  try {
    const { title, content, type = 'normal', isActive = true } = req.body;

    if (!title) {
      return res.status(400).json({ error: '公告标题不能为空' });
    }

    const result = await dbAsync.run(
      `INSERT INTO announcements (title, content, type, is_active, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title, content, type, isActive ? 1 : 0, req.userId]
    );

    const announcement = await dbAsync.get(
      'SELECT * FROM announcements WHERE id = ?',
      [result.id]
    );

    res.status(201).json({ message: '公告创建成功', announcement });
  } catch (error) {
    console.error('创建公告错误:', error);
    res.status(500).json({ error: '创建公告失败' });
  }
});

// 更新公告
router.put('/announcements/:id', async (req, res) => {
  try {
    const { title, content, type, isActive } = req.body;
    const announcement = await dbAsync.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);

    if (!announcement) {
      return res.status(404).json({ error: '公告不存在' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      await dbAsync.run(
        `UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    const updated = await dbAsync.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: '公告更新成功', announcement: updated });
  } catch (error) {
    console.error('更新公告错误:', error);
    res.status(500).json({ error: '更新公告失败' });
  }
});

// 删除公告
router.delete('/announcements/:id', async (req, res) => {
  try {
    const announcement = await dbAsync.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);

    if (!announcement) {
      return res.status(404).json({ error: '公告不存在' });
    }

    await dbAsync.run('DELETE FROM announcements WHERE id = ?', [req.params.id]);

    res.json({ message: '公告已删除' });
  } catch (error) {
    console.error('删除公告错误:', error);
    res.status(500).json({ error: '删除公告失败' });
  }
});

// ============================================================
// 系统配置
// ============================================================

// 获取系统配置
router.get('/config', async (req, res) => {
  try {
    const configs = await dbAsync.all('SELECT * FROM system_config ORDER BY key');

    // 转换为键值对格式
    const configMap = {};
    configs.forEach(c => {
      configMap[c.key] = {
        value: c.value,
        description: c.description,
        updatedAt: c.updated_at
      };
    });

    res.json({ config: configMap });
  } catch (error) {
    console.error('获取系统配置错误:', error);
    res.status(500).json({ error: '获取系统配置失败' });
  }
});

// 更新系统配置
router.put('/config', async (req, res) => {
  try {
    const { configs } = req.body;

    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({ error: '配置数据格式错误' });
    }

    const results = [];
    for (const [key, data] of Object.entries(configs)) {
      const { value, description } = typeof data === 'object' ? data : { value: data, description: null };

      await dbAsync.run(
        `INSERT INTO system_config (key, value, description, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           description = COALESCE(excluded.description, system_config.description),
           updated_at = CURRENT_TIMESTAMP`,
        [key, String(value), description]
      );

      results.push(key);
    }

    // 记录操作日志
    await dbAsync.run(
      'INSERT INTO admin_logs (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)',
      [req.userId, 'update_config', 'system', `更新配置: ${results.join(', ')}`]
    );

    res.json({ message: '配置更新成功', updatedKeys: results });
  } catch (error) {
    console.error('更新系统配置错误:', error);
    res.status(500).json({ error: '更新系统配置失败' });
  }
});

module.exports = router;
