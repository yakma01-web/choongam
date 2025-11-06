// 전역 변수
let currentAdmin = null;
let stocks = [];
let news = [];
let users = [];

// 관리자 로그인
async function adminLogin() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    if (!username || !password) {
        alert('아이디와 비밀번호를 입력해주세요.');
        return;
    }

    try {
        const response = await axios.post('/api/auth/admin-login', { username, password });
        currentAdmin = response.data.admin;
        localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin));
        showMainScreen();
    } catch (error) {
        alert(error.response?.data?.error || '로그인에 실패했습니다.');
    }
}

// 로그아웃
function logout() {
    localStorage.removeItem('currentAdmin');
    currentAdmin = null;
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    
    document.getElementById('adminName').textContent = currentAdmin.username;
    loadData();
}

// 데이터 로드
async function loadData() {
    await loadStocks();
    await loadNews();
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

async function loadNews() {
    try {
        const response = await axios.get('/api/news');
        news = response.data.news;
    } catch (error) {
        console.error('뉴스 로드 실패:', error);
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
    displayStocks();
    displayNews();
    displayUsers();
}

// 주식 목록 표시
function displayStocks() {
    const stocksList = document.getElementById('stocksList');
    stocksList.innerHTML = stocks.map(stock => {
        return `
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h3 class="text-xl font-bold mb-2">${stock.name}</h3>
                <p class="text-gray-600 mb-2">종목코드: ${stock.code}</p>
                <p class="text-3xl font-bold text-purple-600 mb-4">${formatMoney(stock.current_price)}</p>
                <p class="text-sm text-gray-500 mb-4">마지막 업데이트: ${new Date(stock.updated_at).toLocaleString('ko-KR')}</p>
                
                <div class="space-y-2">
                    <label class="block text-gray-700 font-semibold">새로운 주가</label>
                    <div class="flex space-x-2">
                        <input type="number" id="price-${stock.id}" class="flex-1 px-3 py-2 border rounded" value="${stock.current_price}">
                        <button onclick="updateStockPrice(${stock.id})" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-semibold">
                            변경
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
                        <div class="flex-1">
                            <h3 class="text-xl font-bold mb-2">${item.title}</h3>
                            <span class="${typeClass} px-3 py-1 rounded font-semibold text-sm">${typeText}</span>
                        </div>
                        <button onclick="deleteNews(${item.id})" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <p class="text-gray-700 mb-3 whitespace-pre-wrap">${item.content}</p>
                    <div class="flex justify-between items-center text-sm text-gray-500">
                        <span>작성자: ${item.created_by}</span>
                        <span>${new Date(item.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 사용자 목록 표시
function displayUsers() {
    const usersList = document.getElementById('usersList');
    
    if (users.length === 0) {
        usersList.innerHTML = '<p class="text-gray-500 text-center py-8">사용자가 없습니다.</p>';
    } else {
        usersList.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left font-bold">순위</th>
                        <th class="px-6 py-3 text-left font-bold">아이디</th>
                        <th class="px-6 py-3 text-left font-bold">이름</th>
                        <th class="px-6 py-3 text-right font-bold">현금</th>
                        <th class="px-6 py-3 text-right font-bold">주식 가치</th>
                        <th class="px-6 py-3 text-right font-bold">총 자산</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map((user, index) => `
                        <tr class="border-b hover:bg-gray-50">
                            <td class="px-6 py-4 font-bold">${index + 1}</td>
                            <td class="px-6 py-4">${user.username}</td>
                            <td class="px-6 py-4">${user.name}</td>
                            <td class="px-6 py-4 text-right">${formatMoney(user.cash)}</td>
                            <td class="px-6 py-4 text-right">${formatMoney(user.stock_value)}</td>
                            <td class="px-6 py-4 text-right font-bold">${formatMoney(user.total_assets)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// 주가 업데이트
async function updateStockPrice(stockId) {
    const newPrice = parseFloat(document.getElementById(`price-${stockId}`).value);
    
    if (!newPrice || newPrice <= 0) {
        alert('올바른 가격을 입력해주세요.');
        return;
    }

    const stock = stocks.find(s => s.id === stockId);
    
    if (!confirm(`${stock.name}의 주가를 ${formatMoney(newPrice)}로 변경하시겠습니까?`)) {
        return;
    }

    try {
        await axios.post(`/api/stocks/${stockId}/update-price`, {
            price: newPrice,
            adminUsername: currentAdmin.username
        });
        
        alert('주가가 업데이트되었습니다.');
        await loadData();
    } catch (error) {
        alert(error.response?.data?.error || '주가 업데이트에 실패했습니다.');
    }
}

// 뉴스 폼 표시/숨기기
function showNewsForm() {
    document.getElementById('newsForm').classList.remove('hidden');
    document.getElementById('newsTitle').value = '';
    document.getElementById('newsContent').value = '';
    document.getElementById('newsType').value = 'FREE';
    document.getElementById('newsPriceDiv').classList.add('hidden');
}

function hideNewsForm() {
    document.getElementById('newsForm').classList.add('hidden');
}

function toggleNewsPrice() {
    const type = document.getElementById('newsType').value;
    const priceDiv = document.getElementById('newsPriceDiv');
    
    if (type === 'PREMIUM') {
        priceDiv.classList.remove('hidden');
    } else {
        priceDiv.classList.add('hidden');
    }
}

// 뉴스 생성
async function createNews() {
    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    const type = document.getElementById('newsType').value;
    const price = type === 'PREMIUM' ? parseFloat(document.getElementById('newsPrice').value) : 0;

    if (!title || !content) {
        alert('제목과 내용을 입력해주세요.');
        return;
    }

    if (type === 'PREMIUM' && (!price || price <= 0)) {
        alert('올바른 가격을 입력해주세요.');
        return;
    }

    try {
        await axios.post('/api/news', {
            title,
            content,
            type,
            price,
            adminUsername: currentAdmin.username
        });
        
        alert('뉴스가 작성되었습니다.');
        hideNewsForm();
        await loadData();
    } catch (error) {
        alert(error.response?.data?.error || '뉴스 작성에 실패했습니다.');
    }
}

// 뉴스 삭제
async function deleteNews(newsId) {
    if (!confirm('이 뉴스를 삭제하시겠습니까?')) {
        return;
    }

    try {
        await axios.delete(`/api/news/${newsId}`, {
            data: { adminUsername: currentAdmin.username }
        });
        
        alert('뉴스가 삭제되었습니다.');
        await loadData();
    } catch (error) {
        alert(error.response?.data?.error || '뉴스 삭제에 실패했습니다.');
    }
}

// 탭 전환
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-purple-600', 'text-purple-600');
        btn.classList.add('text-gray-600');
    });
    
    event.target.classList.add('border-purple-600', 'text-purple-600');
    event.target.classList.remove('text-gray-600');
}

// 유틸리티 함수
function formatMoney(amount) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

// 페이지 로드 시
window.addEventListener('DOMContentLoaded', () => {
    const savedAdmin = localStorage.getItem('currentAdmin');
    if (savedAdmin) {
        currentAdmin = JSON.parse(savedAdmin);
        showMainScreen();
    }
});
