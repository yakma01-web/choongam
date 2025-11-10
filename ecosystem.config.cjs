module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      // 자동 재시작 설정
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // 메모리 제한 (500MB 초과 시 재시작)
      max_memory_restart: '500M',
      // 에러 로그 관리
      error_file: '/home/user/.pm2/logs/webapp-error.log',
      out_file: '/home/user/.pm2/logs/webapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 크래시 시 자동 재시작
      exp_backoff_restart_delay: 100,
      // 시간 초과 설정
      kill_timeout: 5000,
      listen_timeout: 10000
    }
  ]
}
