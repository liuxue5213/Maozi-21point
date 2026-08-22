# 🎩 帽子21点 - 部署操作指南

## 🚀 快速部署步骤

### 方式一：一键脚本（推荐）

```bash
# 1. 推送到GitHub（会自动创建仓库）
bash scripts/push-to-github.sh你的GitHub用户名

# 2. 配置Secrets
bash scripts/setup-secrets.sh 你的GitHub用户名

# 3. 推送触发部署
git push origin main
```

### 方式二：手动操作

#### 第1步：创建GitHub仓库

1. 打开 https://github.com/new
2. 仓库名：`maozi-21point`
3. 选择 **Public**
4. 不要勾选添加README（本地已有）

#### 第2步：推送代码

```bash
cd /Users/liuxue/Desktop/www/maozi-21point
git remote add origin git@github.com:你的用户名/maozi-21point.git
git branch -M main
git push -u origin main
```

#### 第3步：配置GitHub Secrets

⚠️ **这一步必须手动在网页上操作！**

1. 打开仓库页面 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 依次添加：

| Secret 名称 | 值 |
|------------|-----|
| `SERVER_HOST` | `120.48.13.152` |
| `SERVER_USER` | `root` |
| `SERVER_PASSWORD` | `liuxue5213` |

#### 第4步：触发部署

推送代码后自动触发，或在 Actions 页面手动点击 **Run workflow**

---

## 📱 构建Android APK

在 GitHub Actions 页面：
1. 选择左侧 **帽子21点 - 构建部署**
2. 点击 **Run workflow**
3. 勾选 **构建Android APK**
4. 点击 **Run workflow** 开始构建

构建完成后：
1. 进入本次运行详情页面
2. 底部 **Artifacts** 区域下载 `maozi-21point-android`
3. 解压得到 APK 文件

---

## 🌐 部署验证

部署完成后访问：
- 前端Web: `http://120.48.13.152:60210`
- 后端API: `http://120.48.13.152:60215/api/status`

---

## ⚠️ 注意事项

1. **服务器准备**：确保服务器已开放端口 60210 和 60215
2. **PM2**：首次部署会自动安装PM2
3. **Nginx**：需要手动复制配置文件到服务器
4. **Actions时间**：首次构建Android APK可能需要10-20分钟（需下载依赖）

---

## 🔧 服务器首次配置

如果服务器是新的，先SSH登录执行：

```bash
ssh root@120.48.13.152
bash /www/maozi-21point/scripts/setup-server.sh

# 配置Nginx
cp /www/maozi-21point/nginx/maozi-21point.conf /etc/nginx/conf.d/
nginx -t && systemctl reload nginx
```
