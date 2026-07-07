import { v4 as uuidv4 } from 'uuid'
import { getPool } from '../models/database.js'
import { processDocument, removeDocumentVectors } from './documentProcessor.js'
import { embedText } from './embeddingService.js'
import { searchSimilar, getStats as getVectorStats } from './vectorStore.js'

// ========== 文档管理 CRUD ==========

export async function createDocument(userId, filename, storedName, fileType, fileSize) {
  const pool = getPool()
  const id = uuidv4()
  await pool.execute(
    `INSERT INTO knowledge_docs (id, title, filename, file_type, file_size, status, uploaded_by)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [id, filename, storedName, fileType, fileSize, userId]
  )
  return id
}

export async function updateDocStatus(docId, status, extra = {}) {
  const pool = getPool()
  if (status === 'done') {
    await pool.execute(
      'UPDATE knowledge_docs SET status = ?, char_count = ?, chunk_count = ? WHERE id = ?',
      [status, extra.charCount || 0, extra.chunkCount || 0, docId]
    )
  } else if (status === 'fail') {
    await pool.execute(
      'UPDATE knowledge_docs SET status = ?, error_message = ? WHERE id = ?',
      [status, extra.errorMessage || '未知错误', docId]
    )
  } else {
    await pool.execute(
      'UPDATE knowledge_docs SET status = ? WHERE id = ?',
      [status, docId]
    )
  }
}

export async function getDocumentList(page = 1, size = 20, search = '') {
  const pool = getPool()
  const offset = (page - 1) * size

  let countSql = 'SELECT COUNT(*) as total FROM knowledge_docs'
  let dataSql = 'SELECT * FROM knowledge_docs'
  const params = []

  if (search) {
    const where = ' WHERE title LIKE ?'
    countSql += where
    dataSql += where
    params.push(`%${search}%`)
  }

  dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'

  const [countRows] = await pool.execute(countSql, params)
  const [rows] = await pool.execute(dataSql, [...params, String(size), String(offset)])

  return {
    total: countRows[0].total,
    page,
    size,
    list: rows.map(r => ({
      ...r,
      status: r.status === 'fail' ? 'fail' : r.status === 'done' ? 'done' : r.status
    }))
  }
}

export async function getDocumentById(docId) {
  const pool = getPool()
  const [rows] = await pool.execute('SELECT * FROM knowledge_docs WHERE id = ?', [docId])
  return rows[0] || null
}

export async function deleteDocument(docId) {
  // 1. 删向量
  await removeDocumentVectors(docId)
  // 2. 删数据库记录
  const pool = getPool()
  await pool.execute('DELETE FROM knowledge_docs WHERE id = ?', [docId])
}

export async function getKnowledgeStats() {
  const pool = getPool()
  const [[{ total: docCount }]] = await pool.execute('SELECT COUNT(*) as total FROM knowledge_docs')
  const [[{ total: indexedCount }]] = await pool.execute("SELECT COUNT(*) as total FROM knowledge_docs WHERE status = 'done'")
  const [[sumRow]] = await pool.execute(
    'SELECT COALESCE(SUM(char_count),0) as char_sum, COALESCE(SUM(chunk_count),0) as chunk_sum FROM knowledge_docs'
  )
  const vectorStats = await getVectorStats()

  return {
    docCount: docCount || 0,
    indexedCount: indexedCount || 0,
    totalChars: sumRow?.char_sum || 0,
    totalChunks: sumRow?.chunk_sum || 0,
    vectorChunks: vectorStats.totalChunks
  }
}

// ========== RAG 检索 ==========

/**
 * 在知识库中搜索相关内容
 * @param {string} query - 用户提问
 * @param {number} k - 返回片段数
 */
export async function searchKnowledge(query, k = 5) {
  try {
    const queryEmbedding = await embedText(query)
    const results = await searchSimilar(queryEmbedding, k)
    return results
  } catch {
    // 没有知识库内容时静默失败
    return []
  }
}

/**
 * 安装预置旅游知识（启动时检查并导入）
 */
export async function seedDefaultKnowledge(adminId) {
  const pool = getPool()
  const [rows] = await pool.execute('SELECT COUNT(*) as total FROM knowledge_docs')
  if (rows[0].total > 0) return // 已有知识，跳过

  const presets = [
    { title: '北京旅游攻略', content: '北京是中国的首都，拥有丰富的历史文化遗产。故宫博物院是世界上最大的古代宫殿建筑群，天安门广场是北京的标志性地点。长城（八达岭段）距离市区约1.5小时车程，建议预留一整天。颐和园和圆明园展示了中国古典园林的精髓。天坛是明清皇帝祭天的场所。最佳旅游季节是4-5月和9-10月。北京烤鸭（全聚德、便宜坊）、涮羊肉（东来顺）是必尝美食。地铁是市内最便捷的交通方式。门票：故宫60元，长城40-45元，颐和园30元，天坛15元。' },
    { title: '上海旅游攻略', content: '上海是中国最大的城市，融合了东西方文化。外滩是上海的标志，可以欣赏黄浦江两岸的历史建筑和陆家嘴摩天大楼。东方明珠塔和上海中心大厦是俯瞰城市的最佳地点。南京路步行街是购物的天堂。豫园和城隍庙展示了传统江南园林和市井文化。田子坊和新天地是文艺青年的聚集地。迪士尼乐园适合家庭出游。小笼包（南翔馒头店）、生煎包、本帮菜（老正兴）是必尝美食。地铁网络覆盖全市，出行极为便利。最佳旅游季节是3-5月和9-11月。' },
    { title: '成都旅游攻略', content: '成都以大熊猫和美食闻名。大熊猫繁育研究基地是必去景点，建议早上前往。宽窄巷子和锦里展示了成都的休闲生活方式。武侯祠纪念三国时期的诸葛亮。杜甫草堂是中国文学圣地。都江堰是世界文化遗产，展示了古代水利工程的智慧。火锅（小龙坎、大龙燚）、串串香、担担面、龙抄手是必尝美食。人民公园的鹤鸣茶社可以体验地道成都茶文化。春熙路和太古里是时尚购物区。最佳旅游季节是3-6月和9-11月。成都是通往九寨沟、峨眉山等景点的门户。' },
    { title: '杭州旅游攻略', content: '杭州以西湖闻名天下。西湖十景包括苏堤春晓、断桥残雪、雷峰夕照等。灵隐寺是千年古刹。龙井村可以品茶赏景。西溪湿地是城市中的天然氧吧。宋城展示了宋代文化。河坊街是购买特产的好去处。西湖醋鱼、龙井虾仁、东坡肉、叫化鸡是杭州名菜。杭州四季皆宜，尤其是春季和秋季。市内可骑行游览西湖，公交和地铁也很方便。杭州周边的乌镇、西塘古镇值得一日游。' },
    { title: '西安旅游攻略', content: '西安是十三朝古都。兵马俑是世界第八大奇迹，距离市区约1小时车程，建议预留半天。古城墙是中国保存最完整的古代城垣，可以骑行游览。大雁塔和小雁塔是佛教圣地。回民街是美食天堂。陕西历史博物馆免费参观但需预约。华清池和骊山是体验温泉和历史的好去处。肉夹馍、羊肉泡馍、凉皮、biangbiang面是必尝美食。最佳旅游季节是3-5月和9-11月。西安地铁网络覆盖主要景点，出行便利。' },
  ]

  console.log('📚 正在导入预置旅游知识...')

  for (const preset of presets) {
    try {
      const id = uuidv4()
      await pool.execute(
        `INSERT INTO knowledge_docs (id, title, filename, file_type, file_size, status, char_count, chunk_count, uploaded_by)
         VALUES (?, ?, ?, 'txt', ?, 'done', ?, ?, ?)`,
        [id, preset.title, `${preset.title}.txt`, preset.content.length, preset.content.length, 1, adminId]
      )

      // 生成向量并存入 Chroma
      const { embedTexts } = await import('./embeddingService.js')
      const { addChunks } = await import('./vectorStore.js')
      const chunks = [preset.content]
      const embeddings = await embedTexts(chunks)
      await addChunks(
        [{ id: `${id}_0`, text: chunks[0], metadata: { doc_id: id, doc_name: preset.title, chunk_index: 0 } }],
        embeddings
      )

      console.log(`  ✅ ${preset.title}`)
    } catch (err) {
      console.error(`  ❌ ${preset.title}:`, err.message)
    }
  }

  console.log('📚 预置知识导入完成')
}
