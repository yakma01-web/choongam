import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// Static files
app.use('/static/*', serveStatic({ root: './public' }))

// ==================== 인증 API ====================

// 학생/교사 로그인
app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json()
  
  const user = await c.env.DB.prepare(
    'SELECT id, username, name, user_type, cash, password_changed FROM users WHERE username = ? AND password = ?'
  ).bind(username, password).first()
  
  if (!user) {
    return c.json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' }, 401)
  }
  
  return c.json({ user })
})

// 비밀번호 변경
app.post('/api/auth/change-password', async (c) => {
  const { userId, oldPassword, newPassword } = await c.req.json()
  
  // 현재 비밀번호 확인
  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ? AND password = ?'
  ).bind(userId, oldPassword).first()
  
  if (!user) {
    return c.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, 400)
  }
  
  // 비밀번호 변경
  await c.env.DB.prepare(
    'UPDATE users SET password = ?, password_changed = 1 WHERE id = ?'
  ).bind(newPassword, userId).run()
  
  return c.json({ success: true, message: '비밀번호가 변경되었습니다.' })
})

// 학생 회원가입
app.post('/api/auth/register', async (c) => {
  const { username, password, name } = await c.req.json()
  
  // 중복 체크
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first()
  
  if (existing) {
    return c.json({ error: '이미 존재하는 아이디입니다.' }, 400)
  }
  
  // 사용자 생성
  const result = await c.env.DB.prepare(
    'INSERT INTO users (username, password, name, cash) VALUES (?, ?, ?, ?)'
  ).bind(username, password, name, 1000000.0).run()
  
  const user = await c.env.DB.prepare(
    'SELECT id, username, name, cash FROM users WHERE id = ?'
  ).bind(result.meta.last_row_id).first()
  
  return c.json({ user })
})

// 관리자 로그인
app.post('/api/auth/admin-login', async (c) => {
  const { username, password } = await c.req.json()
  
  const admin = await c.env.DB.prepare(
    'SELECT id, username FROM admins WHERE username = ? AND password = ?'
  ).bind(username, password).first()
  
  if (!admin) {
    return c.json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' }, 401)
  }
  
  return c.json({ admin })
})

// ==================== 주식 API ====================

// 모든 주식 목록 조회
app.get('/api/stocks', async (c) => {
  const stocks = await c.env.DB.prepare(
    'SELECT * FROM stocks ORDER BY id'
  ).all()
  
  return c.json({ stocks: stocks.results })
})

// 특정 주식 상세 조회
app.get('/api/stocks/:id', async (c) => {
  const stockId = c.req.param('id')
  
  const stock = await c.env.DB.prepare(
    'SELECT * FROM stocks WHERE id = ?'
  ).bind(stockId).first()
  
  if (!stock) {
    return c.json({ error: '주식을 찾을 수 없습니다.' }, 404)
  }
  
  // 주가 변동 이력
  const history = await c.env.DB.prepare(
    'SELECT * FROM price_history WHERE stock_id = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(stockId).all()
  
  return c.json({ stock, history: history.results })
})

// 주가 업데이트 (관리자 전용)
app.post('/api/stocks/:id/update-price', async (c) => {
  const stockId = c.req.param('id')
  const { price, adminUsername } = await c.req.json()
  
  // 관리자 인증 확인
  const admin = await c.env.DB.prepare(
    'SELECT id FROM admins WHERE username = ?'
  ).bind(adminUsername).first()
  
  if (!admin) {
    return c.json({ error: '권한이 없습니다.' }, 403)
  }
  
  // 주가 업데이트
  await c.env.DB.prepare(
    'UPDATE stocks SET current_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(price, stockId).run()
  
  // 주가 변동 이력 저장
  await c.env.DB.prepare(
    'INSERT INTO price_history (stock_id, price, changed_by) VALUES (?, ?, ?)'
  ).bind(stockId, price, adminUsername).run()
  
  const stock = await c.env.DB.prepare(
    'SELECT * FROM stocks WHERE id = ?'
  ).bind(stockId).first()
  
  return c.json({ stock })
})

// ==================== 사용자 주식 보유 API ====================

// 사용자 보유 주식 조회
app.get('/api/users/:userId/stocks', async (c) => {
  const userId = c.req.param('userId')
  
  const userStocks = await c.env.DB.prepare(`
    SELECT us.*, s.code, s.name, s.current_price,
           (s.current_price - us.avg_price) * us.quantity as profit,
           ((s.current_price - us.avg_price) / us.avg_price * 100) as profit_rate
    FROM user_stocks us
    JOIN stocks s ON us.stock_id = s.id
    WHERE us.user_id = ? AND us.quantity > 0
  `).bind(userId).all()
  
  return c.json({ userStocks: userStocks.results })
})

// ==================== 거래 API ====================

// 주식 매수
app.post('/api/transactions/buy', async (c) => {
  const { userId, stockId, quantity } = await c.req.json()
  
  // 사용자 정보 조회
  const user = await c.env.DB.prepare(
    'SELECT cash FROM users WHERE id = ?'
  ).bind(userId).first()
  
  if (!user) {
    return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404)
  }
  
  // 주식 정보 조회
  const stock = await c.env.DB.prepare(
    'SELECT current_price FROM stocks WHERE id = ?'
  ).bind(stockId).first()
  
  if (!stock) {
    return c.json({ error: '주식을 찾을 수 없습니다.' }, 404)
  }
  
  const totalAmount = stock.current_price * quantity
  
  // 잔액 확인
  if (user.cash < totalAmount) {
    return c.json({ error: '잔액이 부족합니다.' }, 400)
  }
  
  // 트랜잭션 시작
  // 1. 거래 내역 저장
  await c.env.DB.prepare(
    'INSERT INTO transactions (user_id, stock_id, type, quantity, price, total_amount) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, stockId, 'BUY', quantity, stock.current_price, totalAmount).run()
  
  // 2. 사용자 잔액 차감
  await c.env.DB.prepare(
    'UPDATE users SET cash = cash - ? WHERE id = ?'
  ).bind(totalAmount, userId).run()
  
  // 3. 보유 주식 업데이트
  const existingStock = await c.env.DB.prepare(
    'SELECT quantity, avg_price FROM user_stocks WHERE user_id = ? AND stock_id = ?'
  ).bind(userId, stockId).first()
  
  if (existingStock) {
    // 기존 보유 주식이 있는 경우 평균 매입가 계산
    const totalQuantity = existingStock.quantity + quantity
    const totalValue = (existingStock.avg_price * existingStock.quantity) + (stock.current_price * quantity)
    const newAvgPrice = totalValue / totalQuantity
    
    await c.env.DB.prepare(
      'UPDATE user_stocks SET quantity = ?, avg_price = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND stock_id = ?'
    ).bind(totalQuantity, newAvgPrice, userId, stockId).run()
  } else {
    // 새로운 주식 보유
    await c.env.DB.prepare(
      'INSERT INTO user_stocks (user_id, stock_id, quantity, avg_price) VALUES (?, ?, ?, ?)'
    ).bind(userId, stockId, quantity, stock.current_price).run()
  }
  
  return c.json({ success: true, message: '매수가 완료되었습니다.' })
})

// 주식 매도
app.post('/api/transactions/sell', async (c) => {
  const { userId, stockId, quantity } = await c.req.json()
  
  // 보유 주식 확인
  const userStock = await c.env.DB.prepare(
    'SELECT quantity, avg_price FROM user_stocks WHERE user_id = ? AND stock_id = ?'
  ).bind(userId, stockId).first()
  
  if (!userStock || userStock.quantity < quantity) {
    return c.json({ error: '보유 수량이 부족합니다.' }, 400)
  }
  
  // 주식 정보 조회
  const stock = await c.env.DB.prepare(
    'SELECT current_price FROM stocks WHERE id = ?'
  ).bind(stockId).first()
  
  if (!stock) {
    return c.json({ error: '주식을 찾을 수 없습니다.' }, 404)
  }
  
  const totalAmount = stock.current_price * quantity
  
  // 트랜잭션 시작
  // 1. 거래 내역 저장
  await c.env.DB.prepare(
    'INSERT INTO transactions (user_id, stock_id, type, quantity, price, total_amount) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, stockId, 'SELL', quantity, stock.current_price, totalAmount).run()
  
  // 2. 사용자 잔액 증가
  await c.env.DB.prepare(
    'UPDATE users SET cash = cash + ? WHERE id = ?'
  ).bind(totalAmount, userId).run()
  
  // 3. 보유 주식 업데이트
  const newQuantity = userStock.quantity - quantity
  if (newQuantity === 0) {
    // 모두 매도한 경우 삭제
    await c.env.DB.prepare(
      'DELETE FROM user_stocks WHERE user_id = ? AND stock_id = ?'
    ).bind(userId, stockId).run()
  } else {
    await c.env.DB.prepare(
      'UPDATE user_stocks SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND stock_id = ?'
    ).bind(newQuantity, userId, stockId).run()
  }
  
  return c.json({ success: true, message: '매도가 완료되었습니다.' })
})

// 거래 내역 조회
app.get('/api/transactions/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  const transactions = await c.env.DB.prepare(`
    SELECT t.*, s.code, s.name
    FROM transactions t
    JOIN stocks s ON t.stock_id = s.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
    LIMIT 50
  `).bind(userId).all()
  
  return c.json({ transactions: transactions.results })
})

// ==================== 뉴스 API ====================

// 모든 뉴스 조회
app.get('/api/news', async (c) => {
  const news = await c.env.DB.prepare(
    'SELECT * FROM news ORDER BY created_at DESC'
  ).all()
  
  return c.json({ news: news.results })
})

// 뉴스 생성 (관리자 전용)
app.post('/api/news', async (c) => {
  const { title, content, type, price, adminUsername } = await c.req.json()
  
  // 관리자 인증 확인
  const admin = await c.env.DB.prepare(
    'SELECT id FROM admins WHERE username = ?'
  ).bind(adminUsername).first()
  
  if (!admin) {
    return c.json({ error: '권한이 없습니다.' }, 403)
  }
  
  const result = await c.env.DB.prepare(
    'INSERT INTO news (title, content, type, price, created_by) VALUES (?, ?, ?, ?, ?)'
  ).bind(title, content, type, price || 0, adminUsername).run()
  
  const news = await c.env.DB.prepare(
    'SELECT * FROM news WHERE id = ?'
  ).bind(result.meta.last_row_id).first()
  
  return c.json({ news })
})

// 뉴스 상세 조회 (유료 뉴스는 구매 확인)
app.get('/api/news/:newsId/:userId', async (c) => {
  const newsId = c.req.param('newsId')
  const userId = c.req.param('userId')
  
  const news = await c.env.DB.prepare(
    'SELECT * FROM news WHERE id = ?'
  ).bind(newsId).first()
  
  if (!news) {
    return c.json({ error: '뉴스를 찾을 수 없습니다.' }, 404)
  }
  
  // 무료 뉴스는 바로 반환
  if (news.type === 'FREE') {
    return c.json({ news, purchased: true })
  }
  
  // 유료 뉴스 구매 여부 확인
  const viewed = await c.env.DB.prepare(
    'SELECT id FROM news_views WHERE user_id = ? AND news_id = ?'
  ).bind(userId, newsId).first()
  
  if (viewed) {
    return c.json({ news, purchased: true })
  }
  
  return c.json({ 
    news: {
      ...news,
      content: '이 뉴스는 유료 뉴스입니다. 열람하려면 구매가 필요합니다.'
    }, 
    purchased: false 
  })
})

// 유료 뉴스 구매
app.post('/api/news/purchase', async (c) => {
  const { newsId, userId } = await c.req.json()
  
  // 뉴스 정보 조회
  const news = await c.env.DB.prepare(
    'SELECT * FROM news WHERE id = ?'
  ).bind(newsId).first()
  
  if (!news) {
    return c.json({ error: '뉴스를 찾을 수 없습니다.' }, 404)
  }
  
  if (news.type === 'FREE') {
    return c.json({ error: '무료 뉴스입니다.' }, 400)
  }
  
  // 이미 구매한 뉴스인지 확인
  const viewed = await c.env.DB.prepare(
    'SELECT id FROM news_views WHERE user_id = ? AND news_id = ?'
  ).bind(userId, newsId).first()
  
  if (viewed) {
    return c.json({ error: '이미 구매한 뉴스입니다.' }, 400)
  }
  
  // 사용자 잔액 확인
  const user = await c.env.DB.prepare(
    'SELECT cash FROM users WHERE id = ?'
  ).bind(userId).first()
  
  if (!user) {
    return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404)
  }
  
  if (user.cash < news.price) {
    return c.json({ error: '잔액이 부족합니다.' }, 400)
  }
  
  // 트랜잭션
  // 1. 잔액 차감
  await c.env.DB.prepare(
    'UPDATE users SET cash = cash - ? WHERE id = ?'
  ).bind(news.price, userId).run()
  
  // 2. 열람 기록 저장
  await c.env.DB.prepare(
    'INSERT INTO news_views (user_id, news_id) VALUES (?, ?)'
  ).bind(userId, newsId).run()
  
  return c.json({ success: true, message: '뉴스를 구매했습니다.', news })
})

// 뉴스 삭제 (관리자 전용)
app.delete('/api/news/:newsId', async (c) => {
  const newsId = c.req.param('newsId')
  const { adminUsername } = await c.req.json()
  
  // 관리자 인증 확인
  const admin = await c.env.DB.prepare(
    'SELECT id FROM admins WHERE username = ?'
  ).bind(adminUsername).first()
  
  if (!admin) {
    return c.json({ error: '권한이 없습니다.' }, 403)
  }
  
  await c.env.DB.prepare(
    'DELETE FROM news WHERE id = ?'
  ).bind(newsId).run()
  
  return c.json({ success: true, message: '뉴스가 삭제되었습니다.' })
})

// ==================== 사용자 정보 API ====================

// 사용자 정보 조회
app.get('/api/users/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  const user = await c.env.DB.prepare(
    'SELECT id, username, name, cash FROM users WHERE id = ?'
  ).bind(userId).first()
  
  if (!user) {
    return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404)
  }
  
  return c.json({ user })
})

// 모든 사용자 조회 (관리자 전용 - 순위표용)
app.get('/api/users', async (c) => {
  const users = await c.env.DB.prepare(`
    SELECT u.id, u.username, u.name, u.cash,
           COALESCE(SUM(us.quantity * s.current_price), 0) as stock_value,
           u.cash + COALESCE(SUM(us.quantity * s.current_price), 0) as total_assets
    FROM users u
    LEFT JOIN user_stocks us ON u.id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.id
    GROUP BY u.id
    ORDER BY total_assets DESC
  `).all()
  
  return c.json({ users: users.results })
})

// ==================== 메인 페이지 ====================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>충암고 가상 주식 투자</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="text-center mb-12">
                <h1 class="text-5xl font-bold text-indigo-900 mb-4">
                    <i class="fas fa-chart-line mr-3"></i>
                    충암고 가상 주식 투자
                </h1>
                <p class="text-xl text-gray-700">실전 같은 주식 투자 시뮬레이션</p>
            </div>
            
            <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <!-- 학생 메뉴 -->
                <div class="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition duration-300 transform hover:-translate-y-2">
                    <div class="text-center mb-6">
                        <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user-graduate text-4xl text-blue-600"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800">학생</h2>
                    </div>
                    <p class="text-gray-600 text-center mb-6">
                        주식을 거래하고 투자 실력을 키워보세요
                    </p>
                    <a href="/student" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-center transition duration-200">
                        입장하기
                    </a>
                </div>
                
                <!-- 관리자 메뉴 -->
                <div class="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition duration-300 transform hover:-translate-y-2">
                    <div class="text-center mb-6">
                        <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user-shield text-4xl text-purple-600"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800">관리자</h2>
                    </div>
                    <p class="text-gray-600 text-center mb-6">
                        주가 조정 및 뉴스 관리
                    </p>
                    <a href="/admin" class="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-center transition duration-200">
                        입장하기
                    </a>
                </div>
            </div>
            
            <div class="mt-12 text-center text-gray-600">
                <p>
                    <i class="fas fa-info-circle mr-2"></i>
                    초기 자금: 100만원 | 8개 주식 종목
                </p>
            </div>
        </div>
    </body>
    </html>
  `)
})

// ==================== 학생 페이지 ====================

app.get('/student', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학생 페이지 - 충암고 가상 주식 투자</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    </head>
    <body class="bg-gray-100">
        <!-- 로그인 화면 -->
        <div id="loginScreen" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <h2 class="text-3xl font-bold text-center text-indigo-900 mb-6">
                    <i class="fas fa-user-graduate mr-2"></i>학생/교사 로그인
                </h2>
                <p class="text-center text-gray-600 mb-6">
                    학번 또는 교사 아이디로 로그인하세요<br/>
                    학생: 10101 (1학년 1반 1번) ~ 20130 (2학년 1반 30번)<br/>
                    교사: t001 ~ t090<br/>
                    초기 비밀번호: 1111
                </p>
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">아이디</label>
                        <input type="text" id="loginUsername" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="예: 10101 또는 t001">
                    </div>
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">비밀번호</label>
                        <input type="password" id="loginPassword" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1111">
                    </div>
                    <button onclick="login()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200">
                        로그인
                    </button>
                    <a href="/" class="block text-center text-gray-600 hover:text-gray-800">
                        <i class="fas fa-arrow-left mr-1"></i>메인으로 돌아가기
                    </a>
                </div>
            </div>
        </div>

        <!-- 비밀번호 변경 화면 -->
        <div id="passwordChangeScreen" class="hidden min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <h2 class="text-3xl font-bold text-center text-indigo-900 mb-4">
                    <i class="fas fa-key mr-2"></i>비밀번호 변경
                </h2>
                <p class="text-center text-red-600 font-semibold mb-6">
                    최초 로그인입니다. 비밀번호를 변경해주세요.
                </p>
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">현재 비밀번호</label>
                        <input type="password" id="oldPassword" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1111">
                    </div>
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">새 비밀번호</label>
                        <input type="password" id="newPassword" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="최소 4자 이상">
                    </div>
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">새 비밀번호 확인</label>
                        <input type="password" id="confirmPassword" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button onclick="changePassword()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200">
                        비밀번호 변경
                    </button>
                </div>
            </div>
        </div>

        <!-- 메인 화면 -->
        <div id="mainScreen" class="hidden">
            <!-- 헤더 -->
            <div class="bg-indigo-900 text-white py-4 shadow-lg">
                <div class="container mx-auto px-4 flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-chart-line mr-2"></i>충암고 가상 주식 투자
                    </h1>
                    <div class="flex items-center space-x-6">
                        <div>
                            <span class="text-gray-300">현금:</span>
                            <span id="userCash" class="text-xl font-bold ml-2">0원</span>
                        </div>
                        <div>
                            <span class="text-gray-300">총 자산:</span>
                            <span id="totalAssets" class="text-xl font-bold ml-2">0원</span>
                        </div>
                        <div>
                            <span class="text-gray-300 mr-2" id="userName"></span>
                            <button onclick="logout()" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm">
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 탭 메뉴 -->
            <div class="bg-white shadow-md">
                <div class="container mx-auto px-4">
                    <div class="flex space-x-1">
                        <button onclick="showTab('stocks')" class="tab-btn px-6 py-3 font-semibold border-b-2 border-blue-600 text-blue-600">
                            주식 거래
                        </button>
                        <button onclick="showTab('portfolio')" class="tab-btn px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
                            내 포트폴리오
                        </button>
                        <button onclick="showTab('news')" class="tab-btn px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
                            뉴스
                        </button>
                        <button onclick="showTab('ranking')" class="tab-btn px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
                            투자 랭킹
                        </button>
                    </div>
                </div>
            </div>

            <div class="container mx-auto px-4 py-6">
                <!-- 주식 거래 탭 -->
                <div id="stocksTab" class="tab-content">
                    <h2 class="text-2xl font-bold mb-6">주식 거래</h2>
                    <div id="stocksList" class="grid md:grid-cols-2 gap-6"></div>
                </div>

                <!-- 포트폴리오 탭 -->
                <div id="portfolioTab" class="tab-content hidden">
                    <h2 class="text-2xl font-bold mb-6">내 포트폴리오</h2>
                    <div id="portfolioList" class="space-y-4"></div>
                    
                    <h3 class="text-xl font-bold mt-8 mb-4">거래 내역</h3>
                    <div id="transactionsList" class="space-y-2"></div>
                </div>

                <!-- 뉴스 탭 -->
                <div id="newsTab" class="tab-content hidden">
                    <h2 class="text-2xl font-bold mb-6">뉴스</h2>
                    <div id="newsList" class="space-y-4"></div>
                </div>

                <!-- 투자 랭킹 탭 -->
                <div id="rankingTab" class="tab-content hidden">
                    <h2 class="text-2xl font-bold mb-6">투자 랭킹</h2>
                    <p class="text-gray-600 mb-4">평가 금액(총 자산) 기준 순위입니다</p>
                    <div id="rankingList" class="bg-white rounded-lg shadow-lg overflow-hidden"></div>
                </div>
            </div>
        </div>

        <script src="/static/student.js"></script>
    </body>
    </html>
  `)
})

// ==================== 관리자 페이지 ====================

app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>관리자 페이지 - 충암고 가상 주식 투자</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    </head>
    <body class="bg-gray-100">
        <!-- 로그인 화면 -->
        <div id="loginScreen" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
            <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <h2 class="text-3xl font-bold text-center text-purple-900 mb-6">
                    <i class="fas fa-user-shield mr-2"></i>관리자 로그인
                </h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">아이디</label>
                        <input type="text" id="adminUsername" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    </div>
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">비밀번호</label>
                        <input type="password" id="adminPassword" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    </div>
                    <button onclick="adminLogin()" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition duration-200">
                        로그인
                    </button>
                    <a href="/" class="block text-center text-gray-600 hover:text-gray-800">
                        <i class="fas fa-arrow-left mr-1"></i>메인으로 돌아가기
                    </a>
                </div>
            </div>
        </div>

        <!-- 메인 화면 -->
        <div id="mainScreen" class="hidden">
            <!-- 헤더 -->
            <div class="bg-purple-900 text-white py-4 shadow-lg">
                <div class="container mx-auto px-4 flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-user-shield mr-2"></i>관리자 페이지
                    </h1>
                    <div>
                        <span class="text-gray-300 mr-4" id="adminName"></span>
                        <button onclick="logout()" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm">
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>

            <!-- 탭 메뉴 -->
            <div class="bg-white shadow-md">
                <div class="container mx-auto px-4">
                    <div class="flex space-x-1">
                        <button onclick="showTab('stocks')" class="tab-btn px-6 py-3 font-semibold border-b-2 border-purple-600 text-purple-600">
                            주가 관리
                        </button>
                        <button onclick="showTab('news')" class="tab-btn px-6 py-3 font-semibold text-gray-600 hover:text-purple-600">
                            뉴스 관리
                        </button>
                        <button onclick="showTab('users')" class="tab-btn px-6 py-3 font-semibold text-gray-600 hover:text-purple-600">
                            사용자 관리
                        </button>
                    </div>
                </div>
            </div>

            <div class="container mx-auto px-4 py-6">
                <!-- 주가 관리 탭 -->
                <div id="stocksTab" class="tab-content">
                    <h2 class="text-2xl font-bold mb-6">주가 관리</h2>
                    <div id="stocksList" class="grid md:grid-cols-2 gap-6"></div>
                </div>

                <!-- 뉴스 관리 탭 -->
                <div id="newsTab" class="tab-content hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">뉴스 관리</h2>
                        <button onclick="showNewsForm()" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold">
                            <i class="fas fa-plus mr-2"></i>뉴스 작성
                        </button>
                    </div>
                    
                    <!-- 뉴스 작성 폼 -->
                    <div id="newsForm" class="hidden bg-white rounded-lg shadow-lg p-6 mb-6">
                        <h3 class="text-xl font-bold mb-4">새 뉴스 작성</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">제목</label>
                                <input type="text" id="newsTitle" class="w-full px-4 py-2 border rounded-lg">
                            </div>
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">내용</label>
                                <textarea id="newsContent" rows="5" class="w-full px-4 py-2 border rounded-lg"></textarea>
                            </div>
                            <div class="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-700 font-semibold mb-2">뉴스 유형</label>
                                    <select id="newsType" class="w-full px-4 py-2 border rounded-lg" onchange="toggleNewsPrice()">
                                        <option value="FREE">일반 뉴스 (무료)</option>
                                        <option value="PREMIUM">고급 뉴스 (유료)</option>
                                    </select>
                                </div>
                                <div id="newsPriceDiv" class="hidden">
                                    <label class="block text-gray-700 font-semibold mb-2">가격 (원)</label>
                                    <input type="number" id="newsPrice" class="w-full px-4 py-2 border rounded-lg" value="50000">
                                </div>
                            </div>
                            <div class="flex space-x-4">
                                <button onclick="createNews()" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold">
                                    작성하기
                                </button>
                                <button onclick="hideNewsForm()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold">
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="newsList" class="space-y-4"></div>
                </div>

                <!-- 사용자 관리 탭 -->
                <div id="usersTab" class="tab-content hidden">
                    <h2 class="text-2xl font-bold mb-6">사용자 관리 (순위표)</h2>
                    <div id="usersList" class="bg-white rounded-lg shadow-lg overflow-hidden"></div>
                </div>
            </div>
        </div>

        <script src="/static/admin.js"></script>
    </body>
    </html>
  `)
})

export default app
