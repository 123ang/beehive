// VPS Ecosystem Configuration for Beehive
// Uses ports 3001 (web) and 4001 (API) to avoid conflicts with existing processes
// Home directory: /root

const HOME = '/root';

module.exports = {
  apps: [
    {
      name: 'beehive-api',
      cwd: `${HOME}/projects/beehive/apps/api`,
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        API_PORT: 4001,
      },
      error_file: `${HOME}/projects/beehive/logs/api-error.log`,
      out_file: `${HOME}/projects/beehive/logs/api-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
    },
    {
      name: 'beehive-web',
      cwd: `${HOME}/projects/beehive/apps/web`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: `${HOME}/projects/beehive/logs/web-error.log`,
      out_file: `${HOME}/projects/beehive/logs/web-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
    },
  ],
};

