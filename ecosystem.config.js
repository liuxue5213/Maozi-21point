/**
 * PM2 配置文件
 * 使用: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'maozi-21point',
      script: './backend/src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 60215,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 60215,
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
