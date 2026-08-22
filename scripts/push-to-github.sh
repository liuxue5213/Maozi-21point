#!/bin/bash
# ============================================
# 帽子21点 - 推送到GitHub脚本
# 使用方法: bash scripts/push-to-github.sh <GitHub用户名> [仓库名]
# ============================================

set -e

GITHUB_USER="${1}"
REPO_NAME="${2:-maozi-21point}"

if [ -z "$GITHUB_USER" ]; then
    echo "============================================"
    echo "  🎩 帽子21点 - 推送到GitHub"
    echo "============================================"
    echo ""
    echo "使用方法:"
    echo "  bash scripts/push-to-github.sh <GitHub用户名> [仓库名]"
    echo ""
    echo "示例:"
    echo "  bash scripts/push-to-github.sh yourname"
    echo "  bash scripts/push-to-github.sh yourname maozi-21point"
    echo ""
    exit 1
fi

echo "============================================"
echo "  🎩 帽子21点 - 推送到GitHub"
echo "============================================"
echo ""
echo "  GitHub用户: $GITHUB_USER"
echo "  仓库名: $REPO_NAME"
echo "  远程地址: git@github.com:$GITHUB_USER/$REPO_NAME.git"
echo ""

# 检查gh是否已登录
if ! gh auth status &>/dev/null; then
    echo "[1/4] 请先登录GitHub..."
    gh auth login
fi

# 创建远程仓库（如果不存在）
echo ""
echo "[2/4] 创建远程仓库..."
if gh repo view "$GITHUB_USER/$REPO_NAME" &>/dev/null; then
    echo "  仓库已存在，跳过创建"
else
    gh repo create "$REPO_NAME" --public --description "🎩 帽子21点 - 多端21点扑克游戏"
    echo "  仓库创建成功!"
fi

# 添加远程仓库
echo ""
echo "[3/4] 添加远程仓库..."
if git remote | grep -q "origin"; then
    git remote set-url origin "git@github.com:$GITHUB_USER/$REPO_NAME.git"
else
    git remote add origin "git@github.com:$GITHUB_USER/$REPO_NAME.git"
fi
echo "  远程仓库已配置"

# 推送代码
echo ""
echo "[4/4] 推送代码..."
git branch -M main
git push -u origin main --force
echo "  代码推送成功!"

echo ""
echo "============================================"
echo "  ✅ 推送完成!"
echo "============================================"
echo ""
echo "  仓库地址: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo "  ⚡ 接下来请配置GitHub Secrets:"
echo "  1. 打开: https://github.com/$GITHUB_USER/$REPO_NAME/settings/secrets/actions"
echo "  2. 点击 'New repository secret'"
echo "  3. 添加以下3个Secrets:"
echo ""
echo "     ┌─────────────────┬────────────────┐"
echo "     │ Name            │ Value          │"
echo "     ├─────────────────┼────────────────┤"
echo "     │ SERVER_HOST     │ 120.48.13.152  │"
echo "     │ SERVER_USER     │ root           │"
echo "     │ SERVER_PASSWORD │ liuxue5213     │"
echo "     └─────────────────┴────────────────┘"
echo ""
echo "  4. 配置完成后，GitHub Actions将自动触发"
echo "  5. 在 Actions 页面查看部署进度"
echo ""
echo "  📱 APK下载: Actions完成后在Artifacts中下载"
echo ""
