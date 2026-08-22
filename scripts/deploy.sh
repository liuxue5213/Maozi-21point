#!/bin/bash
# ============================================
# 帽子21点 - 手动部署脚本
# 在本地运行，通过SSH部署到服务器
# ============================================

set -e

SERVER_HOST="${SERVER_HOST:-120.48.13.152}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PASS="${SERVER_PASS:-liuxue5213}"

echo "===== 帽子21点 - 手动部署 ====="
echo "目标服务器: ${SERVER_USER}@${SERVER_HOST}"

# 1. 构建前端
echo "[1/4] 构建前端..."
cd "$(dirname "$0")/../frontend"
npm install
npm run build

# 2. 准备部署包
echo "[2/4] 准备部署包..."
cd "$(dirname "$0")/.."
DEPLOY_DIR="/tmp/maozi-21point-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# 复制必要文件
cp -r backend "$DEPLOY_DIR/"
cp -r frontend/dist "$DEPLOY_DIR/frontend-dist"
cp -r nginx "$DEPLOY_DIR/"
cp ecosystem.config.js "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"

# 3. 上传到服务器
echo "[3/4] 上传到服务器..."
sshpass -p "$SERVER_PASS" rsync -avz --delete \
    -e "ssh -o StrictHostKeyChecking=no" \
    "$DEPLOY_DIR/" \
    "${SERVER_USER}@${SERVER_HOST}:/www/maozi-21point/"

# 4. 在服务器上执行部署
echo "[4/4] 在服务器上执行部署..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no \
    "${SERVER_USER}@${SERVER_HOST}" << 'REMOTE_SCRIPT'
    cd /www/maozi-21point
    
    # 安装后端依赖
    cd backend
    npm install --production
    cd ..
    
    # 复制前端构建产物
    rm -rf frontend/dist
    cp -r frontend-dist frontend/dist
    
    # 重启PM2
    if pm2 list | grep -q "maozi-21point"; then
        pm2 restart maozi-21point
    else
        pm2 start ecosystem.config.js
        pm2 save
    fi
    
    # 配置Nginx (如果配置有变化)
    if [ -f nginx/maozi-21point.conf ]; then
        sudo cp nginx/maozi-21point.conf /etc/nginx/conf.d/maozi-21point.conf
        sudo nginx -t && sudo systemctl reload nginx
    fi
    
    echo "部署完成!"
REMOTE_SCRIPT

# 清理
rm -rf "$DEPLOY_DIR"

echo ""
echo "===== 部署完成 ====="
echo "前端: http://${SERVER_HOST}:60210"
echo "后端: http://${SERVER_HOST}:60215"
