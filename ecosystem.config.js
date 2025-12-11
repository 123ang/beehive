/**
 * PM2 Ecosystem Configuration
 * 
 * IMPORTANT: Update the 'cwd' paths to match your server's application directory.
 * Default assumes: /var/www/beehive
 * 
 * To customize:
 * 1. Update all '/var/www/beehive' paths to your actual deployment directory
 * 2. Ensure log directories exist: mkdir -p /path/to/logs
 */
module.exports = {
  apps: [
    {
      name: 'beehive-api',
      cwd: '/var/www/beehive/apps/api', // Update this path
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/beehive/logs/api-error.log',
      out_file: '/var/www/beehive/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
    },
    {
      name: 'beehive-web',
      cwd: '/var/www/beehive/apps/web', // Update this path
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/www/beehive/logs/web-error.log',
      out_file: '/var/www/beehive/logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
    },
  ],
};
