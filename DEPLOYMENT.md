# 部署指南

本指南介绍如何将 Astro Shibui 模板部署到各种平台。

## 📋 前置准备

在部署之前，请确保：

1. ✅ 已完成站点配置（`src/lib/config.ts`）
2. ✅ 已配置环境变量（`.env`）
3. ✅ 本地构建成功（`pnpm build`）
4. ✅ 已测试开发环境（`pnpm dev`）

## 🚀 部署平台

### 1. Vercel（推荐）

Vercel 是最快的部署平台，支持自动构建和部署。

#### 步骤：

1. **安装 Vercel CLI**
   ```bash
   pnpm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署**
   ```bash
   vercel
   ```

4. **配置环境变量**
   - 在 Vercel 项目设置中添加 `.env` 中的所有环境变量
   - 特别注意：
     - `PUBLIC_SITE_URL` - 您的生产域名
     - `ALGOLIA_*` - Algolia 配置（如果使用搜索）
     - `PUBLIC_PODCAST_*` - 播客配置（如果启用播客）

5. **配置自定义域名**（可选）
   - 在 Vercel 项目设置中添加域名
   - 配置 DNS 记录

#### 自动部署

连接 GitHub 仓库后，每次推送到主分支都会自动触发部署。

### 2. Netlify

Netlify 是另一个优秀的静态站点托管平台。

#### 步骤：

1. **连接 GitHub 仓库**
   - 访问 [Netlify Dashboard](https://app.netlify.com/)
   - 点击 "New site from Git"
   - 选择您的 GitHub 仓库

2. **配置构建设置**
   - **Build command**: `pnpm build`
   - **Publish directory**: `dist`

3. **配置环境变量**
   - 在 Site settings > Environment variables 中添加
   - 添加 `.env` 中的所有变量

4. **配置自定义域名**（可选）
   - 在 Domain settings 中添加域名
   - 配置 DNS 记录

### 3. Cloudflare Pages

Cloudflare Pages 提供全球 CDN 和 DDoS 保护。

#### 步骤：

1. **连接 GitHub 仓库**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 Pages > Create a project
   - 选择您的 GitHub 仓库

2. **配置构建设置**
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`

3. **配置环境变量**
   - 在 Settings > Environment variables 中添加
   - 添加 `.env` 中的所有变量

4. **配置自定义域名**（可选）
   - 在 Custom domains 中添加域名

### 4. GitHub Pages

使用 GitHub Actions 自动部署到 GitHub Pages。

#### 步骤：

1. **创建 GitHub Actions 工作流**

   在项目根目录创建 `.github/workflows/deploy.yml`：

   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest

       steps:
         - name: Checkout
           uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '18'

         - name: Install pnpm
           uses: pnpm/action-setup@v2
           with:
             version: 8

         - name: Install dependencies
           run: pnpm install

         - name: Configure environment variables
           run: |
             echo "PUBLIC_SITE_URL=https://yourusername.github.io" >> $GITHUB_ENV
             echo "PUBLIC_SITE_NAME=Your Site Name" >> $GITHUB_ENV
             # 添加其他必要的环境变量

         - name: Build
           run: pnpm build

         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: ./dist

         - name: Deploy to GitHub Pages
           uses: actions/deploy-pages@v4
   ```

2. **配置 GitHub Pages**

   - 仓库设置 > Pages
   - Source 选择 "GitHub Actions"

3. **配置环境变量**

   - 仓库设置 > Secrets and variables > Actions
   - 添加敏感的环境变量（如 Algolia 密钥）

#### 注意事项

- GitHub Pages 不支持服务器端功能
- 如果使用 Algolia 搜索，需要手动上传索引
- URL 格式：`https://yourusername.github.io/your-repo/`

### 5. 自定义服务器

部署到您自己的服务器（VPS、云服务器等）。

#### 步骤：

1. **在服务器上安装 Node.js**

   ```bash
   # 使用 nvm 安装 Node.js 18
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   ```

2. **克隆代码**

   ```bash
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   ```

3. **安装依赖并构建**

   ```bash
   pnpm install
   pnpm build
   ```

4. **配置 Web 服务器**

   使用 Nginx：

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /path/to/your-repo/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # 启用 gzip 压缩
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   }
   ```

5. **配置 HTTPS**（可选）

   使用 Let's Encrypt：

   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

6. **设置自动部署**（可选）

   创建 `deploy.sh`：

   ```bash
   #!/bin/bash
   cd /path/to/your-repo
   git pull
   pnpm install
   pnpm build
   sudo systemctl reload nginx
   ```

   使用 cron 定期执行或使用 Git webhook 触发。

## 🔧 部署后配置

### 1. 更新 SITE_URL

确保 `.env` 中的 `PUBLIC_SITE_URL` 指向正确的生产域名。

### 2. 配置 DNS

- 添加 A 记录指向服务器 IP（如果是自定义服务器）
- 配置 CNAME 记录（如果使用 CDN）

### 3. 配置 Algolia 搜索（如果使用）

生成并上传搜索索引：

```bash
pnpm algolia
```

### 4. 配置播客音频（如果启用）

- 上传音频文件到配置的 CDN
- 确保音频文件可公开访问
- 测试播客功能是否正常

### 5. 配置评论系统（如果启用）

- 配置 Giscus 仓库设置
- 确保讨论功能已启用

## 📊 监控和优化

### 1. 性能监控

- 使用 [Google PageSpeed Insights](https://pagespeed.web.dev/) 测试
- 使用 [Lighthouse](https://developer.chrome.com/docs/lighthouse/) 进行深度分析

### 2. SEO 优化

- 确保 `robots.txt` 已配置
- 提交 sitemap 到搜索引擎
- 检查 Open Graph 和 Twitter Card 标签

### 3. 缓存配置

配置 CDN 缓存规则：
- HTML 文件：短期缓存（如 1 小时）
- CSS/JS 文件：长期缓存（如 1 年）
- 图片：长期缓存（如 1 年）

## 🔒 安全建议

1. **环境变量安全**
   - 不要提交 `.env` 文件到 Git
   - 使用部署平台的环境变量功能
   - 定期轮换 API 密钥

2. **HTTPS**
   - 始终使用 HTTPS
   - 配置 HSTS 头
   - 使用现代加密算法

3. **CORS**
   - 如果使用外部 API，正确配置 CORS

## 🐛 故障排除

### 构建失败

1. 检查 Node.js 版本
2. 清除缓存：`rm -rf node_modules .astro dist`
3. 重新安装：`pnpm install`

### 部署失败

1. 检查部署平台日志
2. 验证环境变量配置
3. 确认构建命令和输出目录

### 样式不正常

1. 检查静态资源是否正确上传
2. 验证路径是否正确
3. 清除浏览器缓存

### 搜索不工作

1. 确认 Algolia 索引已上传
2. 检查 Algolia API 密钥权限
3. 验证环境变量配置

## 📞 获取帮助

如果遇到部署问题：

1. 查看部署平台的文档
2. 查看 [Astro 部署指南](https://docs.astro.build/en/guides/deploy/)
3. 提交 Issue 到模板仓库
4. 查看 [完全使用指南](src/content/blog-zh/complete-guide.md)

---

**祝您部署顺利！** 🚀
