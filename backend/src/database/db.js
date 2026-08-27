/**
 * 帽子21点 - SQLite数据库连接和初始化
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 数据库文件路径
const dbDir = path.join(__dirname, '../../data');
const dbPath = path.join(dbDir, 'maozi-21point.db');

// 确保数据目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
  } else {
    console.log('✅ SQLite数据库连接成功');
    initializeTables();
  }
});

// 初始化数据库表
function initializeTables() {
  db.serialize(() => {
    // 启用WAL模式提高并发性能
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');

    // 用户表
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        chips INTEGER DEFAULT 1000,
        avatar TEXT DEFAULT 'default',
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        total_winnings INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // 游戏历史表
    db.run(`
      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        game_mode TEXT,
        result TEXT,
        chips_change INTEGER,
        opponent_name TEXT,
        duration_seconds INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 好友关系表
    db.run(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        friend_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (friend_id) REFERENCES users(id),
        UNIQUE(user_id, friend_id)
      )
    `);

    // 成就表
    db.run(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        requirement_type TEXT,
        requirement_value INTEGER,
        reward_chips INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 用户成就关联表
    db.run(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT,
        achievement_id TEXT,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        completed_at DATETIME,
        PRIMARY KEY (user_id, achievement_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (achievement_id) REFERENCES achievements(id)
      )
    `);

    // 聊天消息表
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at DESC)');

    // 管理员操作日志表
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id TEXT,
        action TEXT,
        target_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `);

    // 签到表
    db.run(`
      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        checkin_date DATE NOT NULL,
        streak INTEGER DEFAULT 1,
        reward INTEGER DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, checkin_date)
      )
    `);

    // 公告表
    db.run(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        type TEXT DEFAULT 'normal',
        is_active BOOLEAN DEFAULT 1,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // 系统配置表
    db.run(`
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============ 道具系统表 ============
    
    // 用户道具库存表
    db.run(`
      CREATE TABLE IF NOT EXISTS user_items (
        user_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_type),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // ============ 每日任务表 ============
    
    // 每日任务定义表
    db.run(`
      CREATE TABLE IF NOT EXISTS daily_tasks_def (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        target INTEGER NOT NULL,
        reward INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 用户每日任务进度表
    db.run(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        task_date DATE NOT NULL,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        claimed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES daily_tasks_def(id),
        UNIQUE(user_id, task_id, task_date)
      )
    `);

    // 每日免费道具领取记录
    db.run(`
      CREATE TABLE IF NOT EXISTS daily_free_claims (
        user_id TEXT NOT NULL,
        claim_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, claim_date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // ============ 破产保护表 ============
    
    db.run(`
      CREATE TABLE IF NOT EXISTS bankruptcy_protection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        claim_date DATE NOT NULL,
        amount INTEGER DEFAULT 1000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, claim_date)
      )
    `);

    // ============ 比赛系统表 ============
    
    // 比赛表
    db.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creator_id TEXT,
        max_players INTEGER DEFAULT 8,
        entry_fee INTEGER DEFAULT 0,
        prize_pool INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        start_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);

    // 比赛玩家关联表
    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_players (
        tournament_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        chips_at_start INTEGER DEFAULT 0,
        final_rank INTEGER,
        prize INTEGER DEFAULT 0,
        eliminated BOOLEAN DEFAULT 0,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tournament_id, user_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 创建索引
    db.run('CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_game_history_date ON game_history(created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_users_chips ON users(chips DESC)');
    db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    db.run('CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checkin_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active)');
    db.run('CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)');
    
    // 新表索引
    db.run('CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, task_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_daily_tasks_def_type ON daily_tasks_def(type)');
    db.run('CREATE INDEX IF NOT EXISTS idx_bankruptcy_protection_user ON bankruptcy_protection(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players(tournament_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tournament_players_user ON tournament_players(user_id)');

    // 初始化成就数据
    initializeAchievements();
    
    // 初始化每日任务定义
    initializeDailyTasks();

    console.log('✅ 数据库表初始化完成');
  });
}

// 初始化成就数据
function initializeAchievements() {
  const achievements = [
    { id: 'first_win', name: '首胜', description: '赢得第一局游戏', icon: '🏆', requirement_type: 'games_won', requirement_value: 1, reward_chips: 100 },
    { id: 'win_10', name: '小试牛刀', description: '累计赢得10局游戏', icon: '⭐', requirement_type: 'games_won', requirement_value: 10, reward_chips: 500 },
    { id: 'win_50', name: '老手', description: '累计赢得50局游戏', icon: '🎖️', requirement_type: 'games_won', requirement_value: 50, reward_chips: 2000 },
    { id: 'win_100', name: '大师', description: '累计赢得100局游戏', icon: '👑', requirement_type: 'games_won', requirement_value: 100, reward_chips: 5000 },
    { id: 'play_10', name: '初来乍到', description: '进行10局游戏', icon: '🎮', requirement_type: 'games_played', requirement_value: 10, reward_chips: 200 },
    { id: 'play_50', name: '常客', description: '进行50局游戏', icon: '🎰', requirement_type: 'games_played', requirement_value: 50, reward_chips: 1000 },
    { id: 'play_100', name: '沉迷', description: '进行100局游戏', icon: '🕹️', requirement_type: 'games_played', requirement_value: 100, reward_chips: 2000 },
    { id: 'chips_5000', name: '小有积蓄', description: '累计筹码达到5000', icon: '💰', requirement_type: 'chips_total', requirement_value: 5000, reward_chips: 500 },
    { id: 'chips_10000', name: '富甲一方', description: '累计筹码达到10000', icon: '💎', requirement_type: 'chips_total', requirement_value: 10000, reward_chips: 1000 },
    { id: 'chips_50000', name: '富豪', description: '累计筹码达到50000', icon: '🏦', requirement_type: 'chips_total', requirement_value: 50000, reward_chips: 5000 },
    { id: 'streak_3', name: '三连胜', description: '连续赢得3局', icon: '🔥', requirement_type: 'streak', requirement_value: 3, reward_chips: 300 },
    { id: 'streak_5', name: '五连胜', description: '连续赢得5局', icon: '🔥🔥', requirement_type: 'streak', requirement_value: 5, reward_chips: 800 },
    { id: 'streak_10', name: '十连胜', description: '连续赢得10局', icon: '🔥🔥🔥', requirement_type: 'streak', requirement_value: 10, reward_chips: 2000 },
    { id: 'blackjack_first', name: '黑杰克', description: '获得首次Blackjack', icon: '🃏', requirement_type: 'blackjack', requirement_value: 1, reward_chips: 200 },
    { id: 'level_5', name: '五级玩家', description: '达到5级', icon: '📊', requirement_type: 'level', requirement_value: 5, reward_chips: 500 },
    { id: 'level_10', name: '十级玩家', description: '达到10级', icon: '📈', requirement_type: 'level', requirement_value: 10, reward_chips: 1000 },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO achievements (id, name, description, icon, requirement_type, requirement_value, reward_chips)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  achievements.forEach(a => {
    stmt.run(a.id, a.name, a.description, a.icon, a.requirement_type, a.requirement_value, a.reward_chips);
  });

  stmt.finalize();

  console.log(`✅ 已初始化 ${achievements.length} 个成就`);
}

// 初始化每日任务定义数据
function initializeDailyTasks() {
  const tasks = [
    { id: 'play_3', name: '每日游戏', description: '完成3局游戏', type: 'play_game', target: 3, reward: 200 },
    { id: 'win_2', name: '每日胜利', description: '赢得2局游戏', type: 'win_game', target: 2, reward: 300 },
    { id: 'get_blackjack', name: '黑杰克大师', description: '获得1次Blackjack', type: 'get_blackjack', target: 1, reward: 500 },
    { id: 'play_10', name: '勤奋玩家', description: '完成10局游戏', type: 'play_game', target: 10, reward: 1000 },
    { id: 'win_5', name: '连胜将军', description: '赢得5局游戏', type: 'win_game', target: 5, reward: 800 }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO daily_tasks_def (id, name, description, type, target, reward)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  tasks.forEach(t => {
    stmt.run(t.id, t.name, t.description, t.type, t.target, t.reward);
  });

  stmt.finalize();

  console.log(`✅ 已初始化 ${tasks.length} 个每日任务定义`);
}

// Promise化的数据库操作方法
const dbAsync = {
  // 执行SQL（无返回）
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  // 查询单条
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // 查询多条
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = { db, dbAsync, dbPath };
