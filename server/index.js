// 배포용 최소 서버: 빌드된 화면(dist)과 /api/chat을 함께 제공한다. (Node 내장 모듈만 사용)
// 실행: npm run build && npm start
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleChat, handleComfort } from './chat.js'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const PORT = Number(process.env.PORT) || 3000
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === '/api/chat') return handleChat(req, res)
  if (path === '/api/comfort') return handleComfort(req, res)
  // 앱을 열 때 잠든 서버를 미리 깨우는 용도. 아무 정보도 주고받지 않는다.
  if (path === '/api/health') {
    res.setHeader('Cache-Control', 'no-store')
    return res.end('ok')
  }

  const file = normalize(join(DIST, path === '/' ? 'index.html' : path))
  if (!file.startsWith(DIST.endsWith(sep) ? DIST : DIST + sep)) {
    res.statusCode = 403
    return res.end()
  }
  try {
    const body = await readFile(file)
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream')
    // 화면과 서비스 워커는 늘 새 버전을 확인하게 한다 (해시가 붙은 assets만 오래 저장)
    res.setHeader('Cache-Control', path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
    res.end(body)
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
}).listen(PORT, () => {
  console.log(`마음곁 서버: http://localhost:${PORT}`)
  if (!process.env.OPENAI_API_KEY) console.log('경고: OPENAI_API_KEY가 설정되지 않아 마음 대화가 동작하지 않아요.')
})
