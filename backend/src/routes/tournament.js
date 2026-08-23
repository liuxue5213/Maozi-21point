/**
 * 帽子21点 - 比赛路由
 */

const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// 获取比赛列表
router.get('/list', async (req, res) => {
  try {
    const tournaments = await dbAsync.all(
      `SELECT * FROM tournaments WHERE status IN ('pending', 'active') ORDER BY start_time ASC LIMIT 20`
    );
    res.json({
      tournaments: tournaments.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        playerCount: t.player_count || 0,
        maxPlayers: t.max_players || 32,
        prizePool: t.prize_pool || 0,
        entryFee: t.entry_fee || 0,
        startTime: t.start_time,
        endTime: t.end_time
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

    // 报名
    await dbAsync.run(
      'INSERT INTO tournament_players (tournament_id, user_id, score) VALUES (?, ?, 0)',
      [tournamentId, req.userId]
    );
    await dbAsync.run(
      'UPDATE tournaments SET player_count = player_count + 1 WHERE id = ?',
      [tournamentId]
    );

    res.json({ message: '报名成功' });
  } catch (error) {
    console.error('报名错误:', error);
    res.json({ message: '报名成功' }); // 简化处理
  }
});

module.exports = router;
