# 충암고 가상 주식 투자

충암고등학교 학생들을 위한 실전 같은 가상 주식 투자 시뮬레이션 웹사이트

## 프로젝트 개요

- **프로젝트명**: 충암고 가상 주식 투자
- **목적**: 학생들이 주식 투자를 실전처럼 체험하고 경제 개념을 학습
- **기술 스택**: Hono + TypeScript + Cloudflare D1 + TailwindCSS

## 접속 URL

- **개발 서버**: https://3000-i09kixs4q6553irtu5s6b-583b4d74.sandbox.novita.ai
- **메인 페이지**: `/`
- **학생 페이지**: `/student`
- **관리자 페이지**: `/admin`

## 완료된 기능

### 1. 학생 기능
- ✅ 학번 기반 로그인 (회원가입 불필요)
- ✅ 900명 학생 계정 자동 생성 (1-3학년, 1-10반, 1-30번)
- ✅ 초기 자금 100만원 자동 지급
- ✅ 초기 비밀번호: 1111
- ✅ 8개 주식 종목 실시간 거래 (매수/매도)
- ✅ 포트폴리오 관리 (보유 주식, 수익률 확인)
- ✅ 거래 내역 자동 저장 및 실시간 반영
- ✅ 뉴스 열람 (무료/유료 뉴스 구분)
- ✅ 유료 뉴스 구매 시스템
- ✅ 투자 랭킹 (평가 금액 기준 순위)

### 2. 관리자 기능
- ✅ 관리자 로그인 (ID: cham001, PW: cjstmdgh-01)
- ✅ 주가 실시간 조정
- ✅ 주가 변동 이력 자동 저장
- ✅ 뉴스 작성 (일반/고급 뉴스)
- ✅ 고급 뉴스 가격 설정
- ✅ 뉴스 삭제
- ✅ 사용자 관리 및 순위 확인

### 3. 주식 종목
- ✅ 충암 전자 (CA001) - 초기가: 50,000원
- ✅ 충암 반도체 (CA002) - 초기가: 75,000원
- ✅ 충암 항공 (CA003) - 초기가: 30,000원
- ✅ 충암 자동차 (CA004) - 초기가: 45,000원
- ✅ 충암 바이오 (CA005) - 초기가: 60,000원
- ✅ 충암 화학 (CA006) - 초기가: 35,000원
- ✅ 충암 식품 (CA007) - 초기가: 25,000원
- ✅ 충암 미디어 (CA008) - 초기가: 40,000원

## 데이터 구조

### 데이터베이스 스키마 (Cloudflare D1)

1. **users**: 학생 사용자 정보
   - id, username, password, name, cash
   
2. **admins**: 관리자 정보
   - id, username, password
   
3. **stocks**: 주식 종목 정보
   - id, code, name, current_price
   
4. **user_stocks**: 사용자 주식 보유 정보
   - user_id, stock_id, quantity, avg_price
   
5. **transactions**: 거래 내역
   - user_id, stock_id, type (BUY/SELL), quantity, price
   
6. **news**: 뉴스 정보
   - id, title, content, type (FREE/PREMIUM), price
   
7. **news_views**: 뉴스 열람 기록
   - user_id, news_id
   
8. **price_history**: 주가 변동 이력
   - stock_id, price, changed_by

## 사용자 가이드

### 학생 이용 방법

1. **로그인**
   - 메인 페이지에서 "학생" 클릭
   - 학번 입력 (예: 10101 = 1학년 1반 1번)
   - 비밀번호 입력 (초기 비밀번호: 1111)
   - 자동으로 100만원 지급됨

2. **학번 형식**
   - 1학년 1반 1번: 10101
   - 2학년 5반 15번: 20515
   - 3학년 10반 30번: 31030
   - 총 900명 (1-3학년, 1-10반, 1-30번)

3. **주식 거래**
   - 주식 거래 탭에서 원하는 종목 선택
   - 수량 입력 후 매수/매도 버튼 클릭
   - 잔액 확인 후 거래 완료
   - 거래 내역 자동 저장 및 실시간 반영

4. **포트폴리오 확인**
   - 내 포트폴리오 탭에서 보유 주식 확인
   - 수익률 및 평가 손익 실시간 확인
   - 거래 내역 조회 가능

5. **뉴스 열람**
   - 뉴스 탭에서 무료 뉴스 무제한 열람
   - 고급 뉴스는 설정된 금액 지불 후 열람
   - 한번 구매한 뉴스는 다시 볼 수 있음

6. **투자 랭킹 확인**
   - 투자 랭킹 탭에서 전체 학생 순위 확인
   - 평가 금액 (총 자산) = 현금 + 주식 평가액 기준
   - 실시간 순위 업데이트

### 관리자 이용 방법

1. **로그인**
   - ID: `cham001`
   - PW: `cjstmdgh-01`

2. **주가 조정**
   - 주가 관리 탭에서 종목별 새로운 가격 입력
   - "변경" 버튼으로 실시간 반영
   - 주가 변동 이력 자동 저장

3. **뉴스 작성**
   - 뉴스 관리 탭에서 "뉴스 작성" 클릭
   - 제목, 내용 입력
   - 일반(무료) 또는 고급(유료) 선택
   - 고급 뉴스는 가격 설정 (기본 50,000원)
   - 작성 완료 후 학생들에게 즉시 공개

4. **사용자 관리**
   - 사용자 관리 탭에서 전체 학생 현황 확인
   - 현금, 주식 가치, 총 자산 순위 조회

## 배포 상태

- ✅ 로컬 개발 환경 실행 중
- ✅ Cloudflare D1 로컬 데이터베이스 설정 완료
- ⏳ Cloudflare Pages 프로덕션 배포 대기

## 기술 스택

- **백엔드**: Hono (TypeScript)
- **데이터베이스**: Cloudflare D1 (SQLite)
- **프론트엔드**: HTML + TailwindCSS + Vanilla JavaScript
- **배포**: Cloudflare Pages/Workers
- **프로세스 관리**: PM2

## 개발 환경 실행

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 데이터베이스 초기화
npm run db:reset

# 개발 서버 시작 (PM2)
fuser -k 3000/tcp 2>/dev/null || true
pm2 start ecosystem.config.cjs

# 서버 상태 확인
pm2 list

# 로그 확인
pm2 logs webapp --nostream
```

## API 엔드포인트

### 인증
- `POST /api/auth/login` - 학생 로그인 (학번 기반)
- `POST /api/auth/admin-login` - 관리자 로그인

### 주식
- `GET /api/stocks` - 전체 주식 목록
- `GET /api/stocks/:id` - 주식 상세 정보
- `POST /api/stocks/:id/update-price` - 주가 업데이트 (관리자)

### 거래
- `POST /api/transactions/buy` - 주식 매수
- `POST /api/transactions/sell` - 주식 매도
- `GET /api/transactions/:userId` - 거래 내역

### 뉴스
- `GET /api/news` - 전체 뉴스 목록
- `GET /api/news/:newsId/:userId` - 뉴스 상세 (구매 확인)
- `POST /api/news` - 뉴스 작성 (관리자)
- `POST /api/news/purchase` - 유료 뉴스 구매
- `DELETE /api/news/:newsId` - 뉴스 삭제 (관리자)

### 사용자
- `GET /api/users/:userId` - 사용자 정보
- `GET /api/users` - 전체 사용자 순위
- `GET /api/users/:userId/stocks` - 사용자 보유 주식

## 로그인 정보

### 학생 계정 (총 900명)
- **학번 형식**: 10101 (1학년 1반 1번) ~ 31030 (3학년 10반 30번)
- **초기 비밀번호**: 1111 (모든 학생 공통)
- **초기 자금**: 1,000,000원 (모든 학생 공통)
- **예시**:
  - 1학년 1반 1번: ID `10101`, PW `1111`
  - 2학년 5반 15번: ID `20515`, PW `1111`
  - 3학년 10반 30번: ID `31030`, PW `1111`

### 관리자 계정
- **ID**: cham001
- **PW**: cjstmdgh-01

## 프로젝트 구조

```
webapp/
├── src/
│   └── index.tsx           # Hono 백엔드 API
├── public/
│   └── static/
│       ├── student.js      # 학생 페이지 로직
│       └── admin.js        # 관리자 페이지 로직
├── migrations/
│   └── 0001_initial_schema.sql
├── seed.sql                # 초기 데이터
├── wrangler.jsonc          # Cloudflare 설정
├── ecosystem.config.cjs    # PM2 설정
└── package.json
```

## 향후 개선 사항

- ⏳ 실시간 주가 차트 추가
- ⏳ 포인트 시스템 추가
- ⏳ 주식 토론 게시판
- ⏳ 자동 거래 알림
- ⏳ 배당금 시스템
- ⏳ 주식 분할/병합 기능

## 마지막 업데이트

- **날짜**: 2025-11-06
- **상태**: ✅ 개발 완료, 로컬 테스트 완료
