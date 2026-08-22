#!/bin/bash
# ============================================
# 帽子21点 - 服务器环境初始化脚本
# 在服务器上运行: bash setup-server.sh
# ============================================

set -e

echo "===== 帽子21点 - 服务器环境初始化 ====="

# 更新系统
echo "[1/6] 更新系统..."
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18
echo "[2/6] 安装 Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "Node.js 版本: $(node -v)"
    echo "npm 版本: $(npm -v)"
else
    echo "Node.js 已安装: $(node -v)"
fi

# 安装 PM2
echo "[3/6] 安装 PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo "PM2 安装完成"
else
    echo "PM2 已安装"
fi

# 安装 Nginx
echo "[4/6] 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo "Nginx 安装完成"
else
    echo "Nginx 已安装"
fi

# 配置防火墙
echo "[5/6] 配置防火墙..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 60210/tcp
sudo ufw allow 60215/tcp
sudo ufw --force enable
echo "防火墙配置完成"

# 创建项目目录
echo "[6/6] 创建项目目录..."
sudo mkdir -p /www/maozi-21point/logs
sudo chown -R $USER:$USER /www/maozi-21point
echo "项目目录创建完成: /www/maozi-21point"

echo ""
echo "===== 环境初始化完成 ====="
echo ""
echo "下一步:"
echo "1. 推送代码到 GitHub"
echo "2. 配置 GitHub Secrets (SERVER_HOST, SERVER_USER, SERVER_PASSWORD)"
echo "3. 推送触发自动部署"
echo ""
echo "或者手动部署:"
echo "  cd /www/maozi-21point"
echo "  git clone <your-repo-url> ."
echo "  npm run install:all"
echo "  npm run build"
echo "  pm2 start ecosystem.config.js"
echo "  sudo cp nginx/maozi-21point.conf /etc/nginx/conf.d/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
