#!/bin/bash
# ============================================
# BEEHIVE VPS SETUP SCRIPT (MySQL Version)
# ============================================
# This script sets up a fresh Ubuntu 22.04 VPS
# for the Beehive platform with MySQL

set -e

echo "🐝 ================================================"
echo "   BEEHIVE PLATFORM SETUP (MySQL)"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo ./setup.sh)"
    exit 1
fi

# Update system
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban

# Install Node.js 20.x
log_info "Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
node --version

# Install pnpm
log_info "Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi
pnpm --version

# Install PM2
log_info "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
pm2 --version

# Install MySQL 8.0
log_info "Installing MySQL 8.0..."
if ! command -v mysql &> /dev/null; then
    apt install -y mysql-server mysql-client
fi
systemctl start mysql
systemctl enable mysql

# Install Redis
log_info "Installing Redis..."
if ! command -v redis-cli &> /dev/null; then
    apt install -y redis-server
fi
systemctl start redis-server
systemctl enable redis-server

# Install Nginx
log_info "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
fi
systemctl start nginx
systemctl enable nginx

# Install Certbot for SSL
log_info "Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
fi

# Configure firewall
log_info "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Configure fail2ban
log_info "Configuring fail2ban..."
systemctl start fail2ban
systemctl enable fail2ban

# Create beehive user
log_info "Creating beehive user..."
if ! id "beehive" &>/dev/null; then
    useradd -m -s /bin/bash beehive
    usermod -aG sudo beehive
fi

# Setup MySQL database
log_info "Setting up MySQL database..."
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS beehive CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'beehive'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive'@'localhost';
FLUSH PRIVILEGES;
EOF

# Create project directory
log_info "Creating project directory..."
mkdir -p /var/www/beehive
chown -R beehive:beehive /var/www/beehive

echo ""
echo "🐝 ================================================"
echo "   SETUP COMPLETE!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Clone your repository to /var/www/beehive"
echo "2. Create .env file with your configuration"
echo "3. Run: pnpm install"
echo "4. Run: pnpm db:migrate"
echo "5. Run: pnpm build"
echo "6. Configure Nginx (copy nginx.conf to /etc/nginx/sites-available/beehive)"
echo "7. Run: certbot --nginx -d yourdomain.com"
echo "8. Run: pm2 start ecosystem.config.js"
echo "9. Run: pm2 save && pm2 startup"
echo ""
log_warn "IMPORTANT: Change the MySQL password!"
log_warn "Run: mysql -u root -e \"ALTER USER 'beehive'@'localhost' IDENTIFIED BY 'your_new_password';\""
echo ""
