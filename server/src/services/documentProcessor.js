import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { embedTexts } from './embeddingService.js'
import { addChunks, deleteByDocId } from './vectorStore.js'

/**
 * 读取文件内容
 */
async function readFile(filePath, fileType) {
  const buffer = fs.readFileSync(filePath)

  switch (fileType) {
    case 'pdf': {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      return data.text
    }
    case 'docx': {
      const mammoth = (await import('mammoth')).default
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }
    case 'txt':
    case 'md':
      return buffer.toString('utf-8')
    default:
      throw new Error(`不支持的文件类型: ${fileType}`)
  }
}

/**
 * 中文递归分段
 * chunk_size=1000, overlap=200
 */
function splitText(text, chunkSize = 1000, overlap = 200) {
  // 先按段落分隔
  const separators = ['\n\n', '\n', '。', '！', '？', '；', '.', '!', '?', ';', ' ', '']
  return recursiveSplit(text, separators, chunkSize, overlap)
}

function recursiveSplit(text, separators, chunkSize, overlap) {
  if (text.length <= chunkSize) return text.length > 0 ? [text] : []

  const sep = separators[0]
  const restSeps = separators.slice(1)

  if (!sep) {
    // 无分隔符，强制按长度切
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize))
    }
    return chunks
  }

  const parts = text.split(sep)
  const chunks = []
  let current = ''

  for (const part of parts) {
    const candidate = current ? current + sep + part : part

    if (candidate.length > chunkSize && current.length > 0) {
      // 当前段已够长，保存并重新开始
      chunks.push(current)
      current = part

      // 处理超长单段
      if (part.length > chunkSize) {
        chunks.push(...recursiveSplit(part, restSeps, chunkSize, overlap))
        current = ''
      }
    } else if (candidate.length > chunkSize) {
      chunks.push(...recursiveSplit(candidate, restSeps, chunkSize, overlap))
      current = ''
    } else {
      current = candidate
    }
  }

  if (current) chunks.push(current)

  // 去掉太小的碎片（合并到前一个）
  return chunks.filter(c => c.trim().length > 10)
}

/**
 * 处理文档流水线
 * @param {string} filePath - 文件磁盘路径
 * @param {string} fileType - pdf/docx/txt/md
 * @param {string} docId - 文档数据库 ID
 * @param {string} docName - 文档原始名称
 * @param {function} onProgress - 进度回调
 */
export async function processDocument(filePath, fileType, docId, docName, onProgress) {
  onProgress?.('reading')

  // 1. 读取文件内容
  const rawText = await readFile(filePath, fileType)
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('文件内容为空')
  }

  onProgress?.('splitting')

  // 2. 分段
  const textChunks = splitText(rawText, 1000, 200)
  if (textChunks.length === 0) {
    throw new Error('无法从文件中提取有效文本')
  }

  onProgress?.('embedding')

  // 3. 生成向量（分批，每批20个）
  const chunkRecords = []
  for (let i = 0; i < textChunks.length; i += 20) {
    const batch = textChunks.slice(i, i + 20)
    const embeddings = await embedTexts(batch)

    for (let j = 0; j < batch.length; j++) {
      chunkRecords.push({
        id: `${docId}_${i + j}`,
        text: batch[j],
        embedding: embeddings[j],
        metadata: {
          doc_id: docId,
          doc_name: docName,
          chunk_index: i + j
        }
      })
    }

    onProgress?.(`embedding ${Math.min(i + 20, textChunks.length)}/${textChunks.length}`)
  }

  onProgress?.('storing')

  // 4. 存入 Chroma
  await addChunks(
    chunkRecords.map(c => ({ id: c.id, text: c.text, metadata: c.metadata })),
    chunkRecords.map(c => c.embedding)
  )

  return {
    charCount: rawText.length,
    chunkCount: textChunks.length
  }
}

/**
 * 删除文档的向量数据
 */
export async function removeDocumentVectors(docId) {
  await deleteByDocId(docId)
}
