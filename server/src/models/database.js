import mysql from 'mysql2/promise'
import 'dotenv/config'

let pool = null

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'travel_ai',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
  }
  return pool
}

// 建表 + 种子管理员
export async function initDatabase() {
  const pool = getPool()

  // 先建库（如果不存在）
  const basePool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD
  })
  await basePool.execute(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'travel_ai'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await basePool.end()

  const conn = await pool.getConnection()
  try {
    // 用户表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        nickname VARCHAR(50) DEFAULT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        avatar VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // 对话会话表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) DEFAULT '新对话',
        provider VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // 对话消息表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        role ENUM('user', 'ai') NOT NULL,
        content TEXT NOT NULL,
        tokens JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // 行程保存表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS travel_plans (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        city VARCHAR(100) NOT NULL,
        budget INT NOT NULL,
        days INT NOT NULL,
        plan_data JSON NOT NULL,
        provider VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // Token 撤销表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id VARCHAR(36) PRIMARY KEY,
        jti VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        INDEX idx_jti (jti)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // 知识库文档表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_docs (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        filename VARCHAR(500) NOT NULL,
        stored_name VARCHAR(500) DEFAULT NULL,
        file_type VARCHAR(20) NOT NULL,
        file_size INT DEFAULT 0,
        status ENUM('pending','processing','done','fail') DEFAULT 'pending',
        char_count INT DEFAULT 0,
        chunk_count INT DEFAULT 0,
        error_message TEXT DEFAULT NULL,
        uploaded_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // 歌词缓存表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS song_lyrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        artist VARCHAR(200) NOT NULL DEFAULT '',
        title VARCHAR(300) NOT NULL,
        duration INT NOT NULL DEFAULT 0,
        lrc_text TEXT,
        plain_text TEXT,
        translation TEXT,
        source VARCHAR(50) DEFAULT 'lrclib',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_song (artist, title, duration)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // 用户收藏表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        city VARCHAR(100) NOT NULL,
        province VARCHAR(100) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uk_user_city (user_id, city)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // 确保 nickname 列存在（兼容旧表）
    try { await conn.execute("ALTER TABLE users ADD COLUMN nickname VARCHAR(50) DEFAULT NULL AFTER username") } catch {}

    // 种子管理员
    const { default: bcrypt } = await import('bcryptjs')
    const { v4: uuidv4 } = await import('uuid')
    const [rows] = await conn.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    if (rows.length === 0) {
      const adminId = uuidv4()
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || uuidv4().slice(0, 12)
      const hash = await bcrypt.hash(adminPassword, 12)
      await conn.execute(
        'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
        [adminId, 'admin', hash, 'admin']
      )
      if (process.env.ADMIN_DEFAULT_PASSWORD) {
        console.log('✅ 默认管理员已创建（使用环境变量密码），请立即登录并修改密码')
      } else {
        console.log(`✅ 默认管理员已创建: admin / ${adminPassword}`)
        console.log('⚠️  以上为随机生成的一次性密码，请立即登录并修改！')
      }
    }

    console.log('✅ 数据库表初始化完成')
  } finally {
    conn.release()
  }
}
