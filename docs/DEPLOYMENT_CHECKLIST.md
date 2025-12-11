# ✅ Deployment Checklist

Quick checklist for deploying Beehive to Ubuntu 24.04.

## Pre-Deployment

- [ ] VPS with Ubuntu 24.04 ready
- [ ] Domain DNS configured (A records pointing to VPS IP)
- [ ] SSH access to server
- [ ] Root or sudo access

## Server Setup

- [ ] System updated (`sudo apt update && sudo apt upgrade -y`)
- [ ] Node.js 20.x installed
- [ ] pnpm installed globally
- [ ] Redis installed and running
- [ ] PM2 installed globally
- [ ] Certbot installed

## Database Setup

- [ ] MySQL database `beehive` created
- [ ] MySQL user `beehive` created with privileges
- [ ] Database connection tested

## Application Deployment

- [ ] Application directory created (`/var/www/beehive`)
- [ ] Code uploaded/cloned to server
- [ ] Dependencies installed (`pnpm install`)
- [ ] Shared package built (`cd packages/shared && pnpm build`)
- [ ] Environment file created (`.env` in root)
- [ ] JWT secret generated and set
- [ ] Database migrations run (`pnpm db:push`)
- [ ] Applications built (`pnpm build`)
- [ ] Logs directory created (`mkdir -p logs`)

## Nginx Configuration

- [ ] Nginx config file created (`/etc/nginx/sites-available/beehive`)
- [ ] Site enabled (`sudo ln -s`)
- [ ] Nginx config tested (`sudo nginx -t`)
- [ ] Nginx reloaded (`sudo systemctl reload nginx`)

## SSL Certificate

- [ ] SSL certificate obtained (`sudo certbot --nginx`)
- [ ] Auto-renewal tested (`sudo certbot renew --dry-run`)
- [ ] HTTPS working (test in browser)

## PM2 Setup

- [ ] PM2 ecosystem file created (`ecosystem.config.js`)
- [ ] Applications started with PM2 (`pm2 start ecosystem.config.js`)
- [ ] PM2 config saved (`pm2 save`)
- [ ] PM2 startup configured (`pm2 startup systemd`)

## Firewall

- [ ] UFW configured
- [ ] Ports 22, 80, 443 allowed
- [ ] Firewall enabled

## Verification

- [ ] Frontend accessible: https://beehive-lifestyle.info
- [ ] API health check: https://beehive-lifestyle.info/api/health
- [ ] Admin login working
- [ ] Database connection working
- [ ] Redis connection working
- [ ] PM2 processes running (`pm2 status`)
- [ ] All services running (`sudo systemctl status`)

## Security

- [ ] Strong MySQL password set
- [ ] Strong JWT secret set
- [ ] Firewall enabled
- [ ] SSL certificate valid
- [ ] SSH key authentication (optional but recommended)
- [ ] Fail2ban installed (optional)

## Post-Deployment

- [ ] Database backup script created
- [ ] Monitoring setup (optional)
- [ ] Log rotation configured (optional)
- [ ] Documentation updated with server details

---

## Quick Commands Reference

```bash
# Check all services
pm2 status
sudo systemctl status nginx mysql redis-server

# View logs
pm2 logs
sudo tail -f /var/log/nginx/beehive-error.log

# Restart everything
pm2 restart all
sudo systemctl restart nginx

# Database backup
mysqldump -u beehive -p beehive > backup-$(date +%Y%m%d).sql
```

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

