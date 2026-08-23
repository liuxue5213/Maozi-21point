/**
 * 帽子21点 - 好友系统路由
 * 添加好友、好友列表、在线状态等
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { dbAsync } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

// 获取好友列表
router.get('/', async (req, res) => {
  try {
    const friends = await dbAsync.all(
      `SELECT u.id, u.username, u.avatar, u.chips, u.level, u.last_login,
              f.created_at as friends_since
       FROM friendships f
       JOIN users u ON (
         CASE
           WHEN f.user_id = ? THEN f.friend_id = u.id
           WHEN f.friend_id = ? THEN f.user_id = u.id
         END
       )
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
       ORDER BY u.last_login DESC`,
      [req.userId, req.userId, req.userId, req.userId]
    );

    // 修正：使用更清晰的查询方式
    const friendsList = await dbAsync.all(
      `SELECT u.id, u.username, u.avatar, u.chips, u.level, u.last_login,
              f.created_at as friends_since
       FROM friendships f
       JOIN users u ON u.id = CASE
           WHEN f.user_id = ? THEN f.friend_id
           ELSE f.user_id
         END
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
       ORDER BY u.last_login DESC`,
      [req.userId, req.userId, req.userId]
    );

    res.json({
      friends: friendsList.map(f => ({
        id: f.id,
        username: f.username,
        avatar: f.avatar,
        chips: f.chips,
        level: f.level,
        lastLogin: f.last_login,
        isOnline: isOnline(f.last_login),
        friendsSince: f.friends_since
      })),
      count: friendsList.length
    });
  } catch (error) {
    console.error('获取好友列表错误:', error);
    res.status(500).json({ error: '获取好友列表失败' });
  }
});

// 添加好友
router.post('/add', async (req, res) => {
  try {
    const { friendId, username } = req.body;

    if (!friendId && !username) {
      return res.status(400).json({ error: '请提供好友ID或用户名' });
    }

    let targetUser = null;

    if (friendId) {
      targetUser = await User.findById(friendId);
    } else {
      targetUser = await User.findByUsername(username);
    }

    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (targetUser.id === req.userId) {
      return res.status(400).json({ error: '不能添加自己为好友' });
    }

    if (targetUser.status === 'banned') {
      return res.status(400).json({ error: '该用户已被封禁' });
    }

    // 检查是否已经是好友
    const existingFriendship = await dbAsync.get(
      `SELECT * FROM friendships
       WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [req.userId, targetUser.id, targetUser.id, req.userId]
    );

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ error: '你们已经是好友了' });
      }
      if (existingFriendship.status === 'pending') {
        if (existingFriendship.user_id === req.userId) {
          return res.status(400).json({ error: '好友请求已发送，等待对方确认' });
        } else {
          return res.status(400).json({ error: '对方已发送好友请求，请查看好友请求列表' });
        }
      }
    }

    // 创建好友请求
    await dbAsync.run(
      `INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')`,
      [req.userId, targetUser.id]
    );

    res.status(201).json({
      message: '好友请求已发送',
      request: {
        to: {
          id: targetUser.id,
          username: targetUser.username,
          avatar: targetUser.avatar
        },
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('添加好友错误:', error);
    res.status(500).json({ error: '添加好友失败' });
  }
});

// 接受好友请求
router.post('/accept', async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: '请提供好友请求ID' });
    }

    // 查找好友请求
    const friendship = await dbAsync.get(
      'SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = ?',
      [requestId, req.userId, 'pending']
    );

    if (!friendship) {
      return res.status(404).json({ error: '好友请求不存在或已处理' });
    }

    // 更新好友关系状态
    await dbAsync.run(
      'UPDATE friendships SET status = ? WHERE id = ?',
      ['accepted', requestId]
    );

    // 获取对方信息
    const friend = await User.findById(friendship.user_id);

    res.json({
      message: '已接受好友请求',
      friend: {
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar,
        level: friend.level
      }
    });
  } catch (error) {
    console.error('接受好友请求错误:', error);
    res.status(500).json({ error: '接受好友请求失败' });
  }
});

// 拒绝好友请求
router.post('/reject', async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: '请提供好友请求ID' });
    }

    const friendship = await dbAsync.get(
      'SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = ?',
      [requestId, req.userId, 'pending']
    );

    if (!friendship) {
      return res.status(404).json({ error: '好友请求不存在或已处理' });
    }

    // 删除好友请求
    await dbAsync.run('DELETE FROM friendships WHERE id = ?', [requestId]);

    res.json({ message: '已拒绝好友请求' });
  } catch (error) {
    console.error('拒绝好友请求错误:', error);
    res.status(500).json({ error: '拒绝好友请求失败' });
  }
});

// 删除好友
router.delete('/:id', async (req, res) => {
  try {
    const friendId = req.params.id;

    if (!friendId) {
      return res.status(400).json({ error: '请提供好友ID' });
    }

    // 查找并删除好友关系
    const result = await dbAsync.run(
      `DELETE FROM friendships
       WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
       AND status = 'accepted'`,
      [req.userId, friendId, friendId, req.userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '好友关系不存在' });
    }

    res.json({ message: '已删除好友' });
  } catch (error) {
    console.error('删除好友错误:', error);
    res.status(500).json({ error: '删除好友失败' });
  }
});

// 获取好友请求列表
router.get('/requests', async (req, res) => {
  try {
    // 收到的好友请求
    const receivedRequests = await dbAsync.all(
      `SELECT f.id, f.user_id as from_user_id, f.created_at,
              u.username, u.avatar, u.level, u.chips
       FROM friendships f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = ? AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.userId]
    );

    // 发送的好友请求
    const sentRequests = await dbAsync.all(
      `SELECT f.id, f.friend_id as to_user_id, f.created_at,
              u.username, u.avatar, u.level
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = ? AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.userId]
    );

    res.json({
      received: receivedRequests.map(r => ({
        requestId: r.id,
        from: {
          id: r.from_user_id,
          username: r.username,
          avatar: r.avatar,
          level: r.level,
          chips: r.chips
        },
        sentAt: r.created_at
      })),
      sent: sentRequests.map(r => ({
        requestId: r.id,
        to: {
          id: r.to_user_id,
          username: r.username,
          avatar: r.avatar,
          level: r.level
        },
        sentAt: r.created_at
      }))
    });
  } catch (error) {
    console.error('获取好友请求错误:', error);
    res.status(500).json({ error: '获取好友请求失败' });
  }
});

// 获取在线好友
router.get('/online', async (req, res) => {
  try {
    const onlineFriends = await dbAsync.all(
      `SELECT u.id, u.username, u.avatar, u.chips, u.level, u.last_login
       FROM friendships f
       JOIN users u ON u.id = CASE
           WHEN f.user_id = ? THEN f.friend_id
           ELSE f.user_id
         END
       WHERE (f.user_id = ? OR f.friend_id = ?)
         AND f.status = 'accepted'
         AND u.last_login > datetime('now', '-30 minutes')
       ORDER BY u.last_login DESC`,
      [req.userId, req.userId, req.userId]
    );

    res.json({
      onlineFriends: onlineFriends.map(f => ({
        id: f.id,
        username: f.username,
        avatar: f.avatar,
        chips: f.chips,
        level: f.level,
        lastLogin: f.last_login
      })),
      count: onlineFriends.length
    });
  } catch (error) {
    console.error('获取在线好友错误:', error);
    res.status(500).json({ error: '获取在线好友失败' });
  }
});

// 搜索用户（用于添加好友）
router.get('/search', async (req, res) => {
  try {
    const keyword = req.query.q;

    if (!keyword || keyword.length < 2) {
      return res.status(400).json({ error: '搜索关键词至少2个字符' });
    }

    const users = await dbAsync.all(
      `SELECT id, username, avatar, level, chips, last_login
       FROM users
       WHERE username LIKE ? AND id != ? AND status = 'active'
       ORDER BY level DESC, chips DESC
       LIMIT 20`,
      [`%${keyword}%`, req.userId]
    );

    // 检查与每个用户的好友关系
    const results = await Promise.all(users.map(async (user) => {
      const friendship = await dbAsync.get(
        `SELECT * FROM friendships
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
        [req.userId, user.id, user.id, req.userId]
      );

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        chips: user.chips,
        isOnline: isOnline(user.last_login),
        friendshipStatus: friendship ? friendship.status : null,
        friendshipId: friendship ? friendship.id : null
      };
    }));

    res.json({ users: results });
  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(500).json({ error: '搜索用户失败' });
  }
});

// 辅助函数：判断用户是否在线（30分钟内有活动）
function isOnline(lastLogin) {
  if (!lastLogin) return false;
  const lastLoginTime = new Date(lastLogin).getTime();
  const now = Date.now();
  return now - lastLoginTime < 30 * 60 * 1000;
}

module.exports = router;
