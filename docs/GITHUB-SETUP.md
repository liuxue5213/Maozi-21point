# 🎩 帽子21点 - GitHub 配置指南

## 配置 GitHub Secrets

在 GitHub 仓库中设置以下 Secrets，用于自动部署：

### 设置路径
`Settings → Secrets and variables → Actions → New repository secret`

### 需要的 Secrets

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `SERVER_HOST` | `120.48.13.152` | 服务器IP |
| `SERVER_USER` | `root` | SSH用户名 |
| `SERVER_PASSWORD` | `liuxue5213` | SSH密码 |

### 配置截图指引
1. 打开 GitHub 仓库页面
2. 点击 **Settings** 标签
3. 左侧菜单选择 **Secrets and variables → Actions**
4. 点击 **New repository secret**
5. 依次添加上述三个 Secrets

## 部署触发条件

- 推送到 `main` 或 `master` 分支时自动触发部署
- 也可以在 Actions 页面手动触发（workflow_dispatch）

## 验证部署

部署完成后访问：
- 前端: `http://120.48.13.152:60210`
- 后端API: `http://120.48.13.152:60215/api/status`

## 构建App

在 GitHub Actions 页面：
1. 选择 "帽子21点 - 构建部署" workflow
2. 点击 "Run workflow"
3. 勾选 "构建Android APK"
4. 构建完成后在 Actions 产物中下载 APK
