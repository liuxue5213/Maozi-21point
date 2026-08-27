/**
 * 帽子21点 - 比赛路由
 */

const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// 获取比赛列表
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const tournaments = await dbAsync.all(
      `SELECT t.*, COUNT(tp.user_id) AS player_count,
              MAX(CASE WHEN tp.user_id = ? THEN 1 ELSE 0 END) AS is_registered
       FROM tournaments t
       LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
       WHERE t.status IN ('pending', 'active')
       GROUP BY t.id
       ORDER BY t.start_time ASC
       LIMIT 20`,
      [req.userId]
    );
    res.json({
      tournaments: tournaments.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        playerCount: t.player_count || 0,
        participants: t.player_count || 0,
        maxPlayers: t.max_players || 32,
        maxParticipants: t.max_players || 32,
        prizePool: t.prize_pool || 0,
        prize: t.prize_pool || 0,
        entryFee: t.entry_fee || 0,
        startTime: t.start_time,
        endTime: t.finished_at,
        isRegistered: Boolean(t.is_registered)
      }))
    });
  } catch (error) {
    console.error('获取比赛列表错误:', error);
    res.json({ tournaments: [] });
  }
});

// 参加比赛
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { tournamentId } = req.body;
    if (!tournamentId) return res.status(400).json({ error: '参数错误' });

    const tournament = await dbAsync.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
    if (!tournament) return res.status(404).json({ error: '比赛不存在' });
    if (tournament.status !== 'pending') return res.status(400).json({ error: '比赛已开始或已结束' });

    // 检查是否已参加
    const existing = await dbAsync.get(
      'SELECT * FROM tournament_players WHERE tournament_id = ? AND user_id = ?',
      [tournamentId, req.userId]
    );
    if (existing) return res.status(400).json({ error: '已报名参加' });

    const playerCount = await dbAsync.get(
      'SELECT COUNT(*) AS count FROM tournament_players WHERE tournament_id = ?',
      [tournamentId]
    );
    if (playerCount.count >= tournament.max_players) {
      return res.status(400).json({ error: '比赛人数已满' });
    }

    // 报名。字段与当前 SQLite 表定义保持一致。
    const user = await dbAsync.get('SELECT chips FROM users WHERE id = ?', [req.userId]);
    await dbAsync.run(
      'INSERT INTO tournament_players (tournament_id, user_id, chips_at_start) VALUES (?, ?, ?)',
      [tournamentId, req.userId, user?.chips || 0]
    );

    res.json({ message: '报名成功' });
  } catch (error) {
    console.error('报名错误:', error);
    res.status(500).json({ error: '报名失败，请稍后重试' });
  }
});

module.exports = router;
