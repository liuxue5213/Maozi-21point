#!/bin/bash
# ============================================
# 帽子21点 - 配置GitHub Secrets
# 使用方法: bash scripts/setup-secrets.sh <GitHub用户名> [仓库名]
# ============================================

set -e

GITHUB_USER="${1}"
REPO_NAME="${2:-maozi-21point}"

if [ -z "$GITHUB_USER" ]; then
    echo "============================================"
    echo "  🎩 帽子21点 - 配置GitHub Secrets"
    echo "============================================"
    echo ""
    echo "使用方法:"
    echo "  bash scripts/setup-secrets.sh <GitHub用户名> [仓库名]"
    echo ""
    echo "示例:"
    echo "  bash scripts/setup-secrets.sh yourname"
    echo ""
    exit 1
fi

echo "============================================"
echo "  🎩 帽子21点 - 配置GitHub Secrets"
echo "============================================"
echo ""

# 检查gh是否已登录
if ! gh auth status &>/dev/null; then
    echo "请先登录GitHub:"
    gh auth login
fi

REPO_FULL="$GITHUB_USER/$REPO_NAME"

echo "仓库: $REPO_FULL"
echo ""

# 设置Secrets
echo "[1/3] 设置 SERVER_HOST..."
echo "120.48.13.152" | gh secret set SERVER_HOST --repo "$REPO_FULL" -
echo "  ✅ SERVER_HOST 已设置"

echo "[2/3] 设置 SERVER_USER..."
echo "root" | gh secret set SERVER_USER --repo "$REPO_FULL" -
echo "  ✅ SERVER_USER 已设置"

echo "[3/3] 设置 SERVER_PASSWORD..."
echo "liuxue5213" | gh secret set SERVER_PASSWORD --repo "$REPO_FULL" -
echo "  ✅ SERVER_PASSWORD 已设置"

echo ""
echo "============================================"
echo "  ✅ GitHub Secrets 配置完成!"
echo "============================================"
echo ""
echo "  已配置的Secrets:"
echo "    - SERVER_HOST = 120.48.13.152"
echo "    - SERVER_USER = root"
echo "    - SERVER_PASSWORD = ********"
echo ""
echo "  现在推送代码即可触发自动部署:"
echo "    git push origin main"
echo ""
echo "  Actions页面: https://github.com/$REPO_FULL/actions"
echo ""
