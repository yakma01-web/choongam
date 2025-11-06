-- 관리자 계정 추가 (비밀번호: cjstmdgh-01)
INSERT OR IGNORE INTO admins (username, password) VALUES 
  ('cham001', 'cjstmdgh-01');

-- 주식 종목 추가
INSERT OR IGNORE INTO stocks (code, name, current_price) VALUES 
  ('CA001', '충암 전자', 50000.0),
  ('CA002', '충암 반도체', 75000.0),
  ('CA003', '충암 항공', 30000.0),
  ('CA004', '충암 자동차', 45000.0),
  ('CA005', '충암 바이오', 60000.0),
  ('CA006', '충암 화학', 35000.0),
  ('CA007', '충암 식품', 25000.0),
  ('CA008', '충암 미디어', 40000.0);

-- 테스트용 학생 계정 (비밀번호: test123)
INSERT OR IGNORE INTO users (username, password, name, cash) VALUES 
  ('student1', 'test123', '학생1', 1000000.0),
  ('student2', 'test123', '학생2', 1000000.0);

-- 초기 뉴스 샘플
INSERT OR IGNORE INTO news (title, content, type, price, created_by) VALUES 
  ('충암 전자 신제품 출시 예정', '충암 전자가 다음 달 혁신적인 신제품을 출시할 예정입니다. 시장 반응이 주목됩니다.', 'FREE', 0, 'cham001'),
  ('충암 반도체 미국 공장 증설', '충암 반도체가 미국 텍사스에 대규모 공장 증설을 발표했습니다. 투자액은 약 5조원 규모입니다.', 'PREMIUM', 50000.0, 'cham001'),
  ('충암 항공 신규 노선 확대', '충암 항공이 동남아 5개 도시로 신규 노선을 확대합니다.', 'FREE', 0, 'cham001');
