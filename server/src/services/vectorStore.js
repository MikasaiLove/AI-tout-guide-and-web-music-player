import { getPool } from '../models/database.js'

let tableReady = false

async function ensureTable() {
  const pool = getPool()
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS vectors (
      id VARCHAR(200) PRIMARY KEY,
      embedding JSON NOT NULL,
      metadata JSON DEFAULT NULL,
      text LONGTEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function addChunks(chunks, embeddings) {
  if (!tableReady) { await ensureTable(); tableReady = true }
  const pool = getPool()

  for (let i = 0; i < chunks.length; i++) {
    await pool.execute(
      'REPLACE INTO vectors (id, embedding, metadata, text) VALUES (?, ?, ?, ?)',
      [chunks[i].id, JSON.stringify(embeddings[i]), JSON.stringify(chunks[i].metadata), chunks[i].text]
    )
  }
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export async function searchSimilar(queryEmbedding, k = 5) {
  if (!tableReady) { await ensureTable(); tableReady = true }
  const pool = getPool()

  const [rows] = await pool.execute('SELECT id, embedding, metadata, text FROM vectors')
  if (rows.length === 0) return []

  const scored = rows.map(row => ({
    id: row.id,
    embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    text: row.text || '',
    score: 0
  })).map(item => ({
    ...item,
    score: cosineSimilarity(queryEmbedding, item.embedding)
  }))

  scored.sort((a, b) => b.score - a.score)

  // 去重 by doc_id，返回 top-k
  const seen = new Set()
  const result = []
  for (const item of scored) {
    const docId = item.metadata?.doc_id
    if (docId && !seen.has(docId)) {
      seen.add(docId)
      result.push({ text: item.text, metadata: item.metadata, score: item.score })
      if (result.length >= k) break
    }
  }
  return result
}

export async function deleteByDocId(docId) {
  if (!tableReady) { await ensureTable(); tableReady = true }
  const pool = getPool()
  await pool.execute(
    "DELETE FROM vectors WHERE JSON_EXTRACT(metadata, '$.doc_id') = ?",
    [docId]
  )
}

export async function getStats() {
  try {
    if (!tableReady) { await ensureTable(); tableReady = true }
    const pool = getPool()
    const [rows] = await pool.execute('SELECT COUNT(*) as total FROM vectors')
    return { totalChunks: rows[0].total }
  } catch {
    return { totalChunks: 0 }
  }
}
