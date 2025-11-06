// 전역 변수
let currentUser = null;
let stocks = [];
let userStocks = [];
let news = [];
let transactions = [];
let users = [];

// 로그인
async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('아이디와 비밀번호를 입력해주세요.');
        return;
    }

    try {
        const response = await axios.post('/api/auth/login', { username, password });
        currentUser = response.data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMainScreen();
    } catch (error) {
        alert(error.response?.data?.error || '로그인에 실패했습니다.');
    }
}

// 회원가입
async function register() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value;

    if (!username || !password || !name) {
        alert('모든 항목을 입력해주세요.');
        return;
    }

    try {
        const response = await axios.post('/api/auth/register', { username, password, name });
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        showLogin();
    } catch (error) {
        alert(error.response?.data?.error || '회원가입에 실패했습니다.');
    }
}

// 로그아웃
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

// 화면 전환
function showRegister() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    
    document.getElementById('userName').textContent = currentUser.name;
    loadData();
}

// 데이터 로드
async function loadData() {
    await loadStocks();
    await loadUserInfo();
    await loadUserStocks();
    await loadNews();
    await loadTransactions();
    await loadUsers();
    updateDisplay();
}

async function loadStocks() {
    try {
        const response = await axios.get('/api/stocks');
        stocks = response.data.stocks;
    } catch (error) {
        console.error('주식 로드 실패:', error);
    }
}

async function loadUserInfo() {
    try {
        const response = await axios.get(`/api/users/${currentUser.id}`);
        currentUser = response.data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
    }
}

async function loadUserStocks() {
    try {
        const response = await axios.get(`/api/users/${currentUser.id}/stocks`);
        userStocks = response.data.userStocks;
    } catch (error) {
        console.error('보유 주식 로드 실패:', error);
    }
}

async function loadNews() {
    try {
        const response = await axios.get('/api/news');
        news = response.data.news;
    } catch (error) {
        console.error('뉴스 로드 실패:', error);
    }
}

async function loadTransactions() {
    try {
        const response = await axios.get(`/api/transactions/${currentUser.id}`);
        transactions = response.data.transactions;
    } catch (error) {
        console.error('거래 내역 로드 실패:', error);
    }
}

async function loadUsers() {
    try {
        const response = await axios.get('/api/users');
        users = response.data.users;
    } catch (error) {
        console.error('사용자 목록 로드 실패:', error);
    }
}

// 화면 업데이트
function updateDisplay() {
    const totalStockValue = userStocks.reduce((sum, stock) => sum + (stock.current_price * stock.quantity), 0);
    const totalAssets = currentUser.cash + totalStockValue;

    document.getElementById('userCash').textContent = formatMoney(currentUser.cash);
    document.getElementById('totalAssets').textContent = formatMoney(totalAssets);

    displayStocks();
    displayPortfolio();
    displayNews();
    displayRanking();
}

// 주식 목록 표시
function displayStocks() {
    const stocksList = document.getElementById('stocksList');
    stocksList.innerHTML = stocks.map(stock => {
        const userStock = userStocks.find(us => us.stock_id === stock.id);
        const holding = userStock ? userStock.quantity : 0;

        return `
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h3 class="text-xl font-bold mb-2">${stock.name}</h3>
                <p class="text-gray-600 mb-2">종목코드: ${stock.code}</p>
                <p class="text-3xl font-bold text-blue-600 mb-4">${formatMoney(stock.current_price)}</p>
                <p class="text-sm text-gray-600 mb-4">보유 수량: ${holding}주</p>
                
                <div class="space-y-2">
                    <div class="flex space-x-2">
                        <input type="number" id="qty-${stock.id}" class="flex-1 px-3 py-2 border rounded" placeholder="수량" min="1" value="1">
                        <button onclick="buyStock(${stock.id})" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold">
                            매수
                        </button>
                        <button onclick="sellStock(${stock.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold" ${holding === 0 ? 'disabled' : ''}>
                            매도
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 포트폴리오 표시
function displayPortfolio() {
    const portfolioList = document.getElementById('portfolioList');
    
    if (userStocks.length === 0) {
        portfolioList.innerHTML = '<p class="text-gray-500 text-center py-8">보유한 주식이 없습니다.</p>';
    } else {
        portfolioList.innerHTML = userStocks.map(stock => {
            const profitColor = stock.profit >= 0 ? 'text-red-600' : 'text-blue-600';
            const profitSign = stock.profit >= 0 ? '+' : '';
            
            return `
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="text-xl font-bold">${stock.name}</h3>
                            <p class="text-gray-600">수량: ${stock.quantity}주 | 평균 매입가: ${formatMoney(stock.avg_price)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-bold">${formatMoney(stock.current_price)}</p>
                            <p class="${profitColor} font-semibold">
                                ${profitSign}${formatMoney(stock.profit)} (${profitSign}${stock.profit_rate.toFixed(2)}%)
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 거래 내역
    const transactionsList = document.getElementById('transactionsList');
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<p class="text-gray-500 text-center py-8">거래 내역이 없습니다.</p>';
    } else {
        transactionsList.innerHTML = transactions.map(tx => {
            const typeClass = tx.type === 'BUY' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
            const typeText = tx.type === 'BUY' ? '매수' : '매도';
            
            return `
                <div class="bg-white rounded shadow p-4 flex justify-between items-center">
                    <div>
                        <span class="${typeClass} px-3 py-1 rounded font-semibold text-sm">${typeText}</span>
                        <span class="ml-3 font-semibold">${tx.name}</span>
                        <span class="ml-3 text-gray-600">${tx.quantity}주 @ ${formatMoney(tx.price)}</span>
                    </div>
                    <div class="text-right">
                        <p class="font-bold">${formatMoney(tx.total_amount)}</p>
                        <p class="text-sm text-gray-500">${new Date(tx.created_at).toLocaleString('ko-KR')}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 뉴스 표시
function displayNews() {
    const newsList = document.getElementById('newsList');
    
    if (news.length === 0) {
        newsList.innerHTML = '<p class="text-gray-500 text-center py-8">등록된 뉴스가 없습니다.</p>';
    } else {
        newsList.innerHTML = news.map(item => {
            const typeClass = item.type === 'FREE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
            const typeText = item.type === 'FREE' ? '무료' : `유료 (${formatMoney(item.price)})`;
            
            return `
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-xl font-bold flex-1">${item.title}</h3>
                        <span class="${typeClass} px-3 py-1 rounded font-semibold text-sm">${typeText}</span>
                    </div>
                    <p class="text-gray-600 mb-3">${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}</p>
                    <div class="flex justify-between items-center">
                        <p class="text-sm text-gray-500">${new Date(item.created_at).toLocaleString('ko-KR')}</p>
                        <button onclick="viewNews(${item.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                            자세히 보기
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 순위표 표시
function displayRanking() {
    const rankingList = document.getElementById('rankingList');
    
    if (users.length === 0) {
        rankingList.innerHTML = '<p class="text-gray-500 text-center py-8">사용자가 없습니다.</p>';
    } else {
        rankingList.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left font-bold">순위</th>
                        <th class="px-6 py-3 text-left font-bold">이름</th>
                        <th class="px-6 py-3 text-right font-bold">현금</th>
                        <th class="px-6 py-3 text-right font-bold">주식 가치</th>
                        <th class="px-6 py-3 text-right font-bold">총 자산</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map((user, index) => {
                        const isMe = user.id === currentUser.id;
                        const bgClass = isMe ? 'bg-blue-50 font-bold' : '';
                        
                        return `
                            <tr class="${bgClass} border-b">
                                <td class="px-6 py-4">${index + 1}</td>
                                <td class="px-6 py-4">${user.name} ${isMe ? '(나)' : ''}</td>
                                <td class="px-6 py-4 text-right">${formatMoney(user.cash)}</td>
                                <td class="px-6 py-4 text-right">${formatMoney(user.stock_value)}</td>
                                <td class="px-6 py-4 text-right">${formatMoney(user.total_assets)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
}

// 매수
async function buyStock(stockId) {
    const quantity = parseInt(document.getElementById(`qty-${stockId}`).value);
    
    if (!quantity || quantity <= 0) {
        alert('수량을 입력해주세요.');
        return;
    }

    const stock = stocks.find(s => s.id === stockId);
    const totalAmount = stock.current_price * quantity;

    if (currentUser.cash < totalAmount) {
        alert('잔액이 부족합니다.');
        return;
    }

    if (!confirm(`${stock.name} ${quantity}주를 ${formatMoney(totalAmount)}에 매수하시겠습니까?`)) {
        return;
    }

    try {
        await axios.post('/api/transactions/buy', {
            userId: currentUser.id,
            stockId: stockId,
            quantity: quantity
        });
        
        alert('매수가 완료되었습니다.');
        await loadData();
    } catch (error) {
        alert(error.response?.data?.error || '매수에 실패했습니다.');
    }
}

// 매도
async function sellStock(stockId) {
    const quantity = parseInt(document.getElementById(`qty-${stockId}`).value);
    
    if (!quantity || quantity <= 0) {
        alert('수량을 입력해주세요.');
        return;
    }

    const userStock = userStocks.find(us => us.stock_id === stockId);
    if (!userStock || userStock.quantity < quantity) {
        alert('보유 수량이 부족합니다.');
        return;
    }

    const stock = stocks.find(s => s.id === stockId);
    const totalAmount = stock.current_price * quantity;

    if (!confirm(`${stock.name} ${quantity}주를 ${formatMoney(totalAmount)}에 매도하시겠습니까?`)) {
        return;
    }

    try {
        await axios.post('/api/transactions/sell', {
            userId: currentUser.id,
            stockId: stockId,
            quantity: quantity
        });
        
        alert('매도가 완료되었습니다.');
        await loadData();
    } catch (error) {
        alert(error.response?.data?.error || '매도에 실패했습니다.');
    }
}

// 뉴스 보기
async function viewNews(newsId) {
    try {
        const response = await axios.get(`/api/news/${newsId}/${currentUser.id}`);
        const { news, purchased } = response.data;

        if (!purchased) {
            if (confirm(`이 뉴스는 ${formatMoney(news.price)}입니다. 구매하시겠습니까?`)) {
                try {
                    const purchaseResponse = await axios.post('/api/news/purchase', {
                        newsId: newsId,
                        userId: currentUser.id
                    });
                    
                    alert('뉴스를 구매했습니다.');
                    await loadData();
                    viewNews(newsId);
                } catch (error) {
                    alert(error.response?.data?.error || '뉴스 구매에 실패했습니다.');
                }
            }
        } else {
            alert(`[${news.title}]\n\n${news.content}`);
        }
    } catch (error) {
        alert('뉴스를 불러오는데 실패했습니다.');
    }
}

// 탭 전환
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-600', 'text-blue-600');
        btn.classList.add('text-gray-600');
    });
    
    event.target.classList.add('border-blue-600', 'text-blue-600');
    event.target.classList.remove('text-gray-600');
}

// 유틸리티 함수
function formatMoney(amount) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

// 페이지 로드 시
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainScreen();
    }
});
