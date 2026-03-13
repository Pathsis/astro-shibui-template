# Astro Shibui Template

> 一个优雅、极简的 Astro 博客模板，支持多语言、播客、搜索等功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Astro](https://img.shields.io/badge/Astro-6.0+-orange.svg)

## 🔍 预览

- 预览站点：https://pathos.page

## ✨ 特性

- 🎨 **极简设计**: 清爽的视觉风格，专注于阅读体验
- 🌍 **多语言**: 原生支持中英双语切换
- 🔍 **全文搜索**: 集成 Algolia 搜索（可配置）
- 🎙️ **播客支持**: 可选的 AI 播客功能（默认禁用）
- 📱 **响应式**: 完美适配桌面和移动设备
- ⚡ **性能优先**: 静态生成，加载极速
- 🎯 **零分析**: 移除所有追踪工具，保护隐私
- ⚙️ **完全可配置**: 统一的配置系统，轻松自定义

## 🚀 快速开始

### 前置要求

- Node.js >= 18.x
- pnpm 8.x 或更高版本

### 安装

```bash
# 克隆模板
git clone https://github.com/Pathsis/astro-shibui-template.git my-blog
cd my-blog

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置必要的环境变量
```

### 开发

```bash
pnpm dev
```

访问 http://localhost:4321

### 构建

```bash
pnpm build
```

构建产物位于 `dist/` 目录。

## ⚙️ 配置

### 1. 配置站点信息

编辑 `src/lib/config.ts`：

```typescript
export const siteConfig = {
  // 基本信息
  name: "Your Site Name",
  description: "Your site description",
  author: "Your Name",
  url: "https://yourdomain.com",

  // 功能开关
  features: {
    podcast: {
      enabled: false,  // 启用播客功能（默认禁用）
    },
    search: {
      enabled: true,   // 启用搜索功能（默认启用）
    },
    comments: {
      enabled: false, // 启用评论功能（默认禁用）
    },
  },

  // 外观配置
  appearance: {
    featuredImage: "",  // 封面图 URL
    showFeaturedImageOnHome: false,
  },
};
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
# 站点基本信息（必需）
PUBLIC_SITE_URL=https://yourdomain.com
PUBLIC_SITE_NAME="Your Site Name"
PUBLIC_SITE_DESCRIPTION="Your site description"

# Algolia 搜索（启用搜索时必需）
ALGOLIA_APP_ID=your_app_id
ALGOLIA_SEARCH_KEY=your_search_key
ALGOLIA_INDEX_NAME=your_index_name
ALGOLIA_ADMIN_KEY=your_admin_key  # 仅用于上传索引

# 播客功能（可选）
PUBLIC_PODCAST_ENABLED=false
PUBLIC_PODCAST_AUDIO_BASE_URL=https://your-cdn.com/

# 评论系统（可选）
PUBLIC_GISCUS_REPO=username/repo
PUBLIC_GISCUS_REPO_ID=repo_id
PUBLIC_GISCUS_CATEGORY=Announcements
PUBLIC_GISCUS_CATEGORY_ID=category_id
PUBLIC_GISCUS_THEME=light
```

### 3. 配置 PWA（可选）

编辑 `public/site.webmanifest`：

```json
{
  "name": "Your Site Name",
  "short_name": "Your Site",
  "description": "Your site description"
}
```

## 📝 内容管理

### 文章结构

```
src/content/
├── blog-zh/              # 中文文章
│   └── my-post.md
└── blog-en/              # 英文文章
    └── my-post.md
```

> 注意：英文文章只需放在 `blog-en` 目录，文件名与中文文章相同即可自动配对。

### 文章 Frontmatter

```yaml
---
title: "文章标题"
description: "文章描述"
date: 2026-03-13
tags: ["标签1", "标签2"]
toc: false
images: ["/images/cover.jpg"]
draft: false
categories: ["技术"]
podcast: false  # 设为 true 启用播客
---
```

## 🎙️ 播客功能（可选）

播客功能默认禁用。如需启用：

### 1. 启用播客功能

在 `src/lib/config.ts` 中设置：
```typescript
features: {
  podcast: { enabled: true },
}
```

### 2. 配置音频服务器

在 `.env` 中配置：
```bash
PUBLIC_PODCAST_ENABLED=true
PUBLIC_PODCAST_AUDIO_BASE_URL=https://your-cdn.com/
```

### 3. 在文章中启用播客

在文章 frontmatter 中添加：
```yaml
---
podcast: true
---
```

### 4. 上传音频文件

将音频文件上传到配置的 CDN，文件名格式：
- 中文：`{slug}.m4a`
- 英文：`{slug}.en.m4a`

## 🔍 搜索功能

### 配置 Algolia

1. 注册 [Algolia](https://www.algolia.com/)
2. 创建应用程序和索引
3. 在 `.env` 中配置 Algolia 凭证

### 生成搜索索引

```bash
# 生成索引
pnpm build-index

# 上传索引到 Algolia
pnpm upload-index

# 或一次性完成
pnpm algolia
```

搜索功能默认启用。如需禁用，在 `src/lib/config.ts` 中设置：
```typescript
features: {
  search: { enabled: false },
}
```

## 🎨 自定义

### 修改样式

所有样式都在 `src/styles/` 目录中：
- `global.css` - 全局样式
- `podcast-player.css` - 播放器样式

### 修改布局

- `src/layouts/BaseLayout.astro` - 基础布局
- `src/layouts/CoverLayout.astro` - 封面布局

### 修改组件

所有组件都在 `src/components/` 目录中。

## 🚀 部署

### Vercel（推荐）

```bash
# 安装 Vercel CLI
pnpm i -g vercel

# 部署
vercel
```

配置环境变量：
- 在 Vercel 项目设置中添加 `.env` 中的所有环境变量
- 每次部署会自动触发构建

### Netlify

1. 连接 GitHub 仓库
2. 配置构建命令：`pnpm build`
3. 配置发布目录：`dist`
4. 在设置中添加环境变量

### Cloudflare Pages

1. 连接 GitHub 仓库
2. 配置构建命令：`pnpm build`
3. 配置输出目录：`dist`
4. 在设置中添加环境变量

### GitHub Pages

使用 GitHub Actions 自动部署：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 📚 文档

- [完全使用指南（中文）](src/content/blog-zh/complete-guide.md)
- [完全使用指南（英文）](src/content/blog-en/complete-guide.md)
- [部署指南](DEPLOYMENT.md)

## 🔧 故障排除

### 构建失败

1. 检查 Node.js 版本（需要 >= 18）
2. 删除 `node_modules` 和 `pnpm-lock.yaml`，重新安装
3. 检查 `.env` 文件是否正确配置

### 样式不正常

1. 运行 `pnpm install` 重新安装依赖
2. 清除浏览器缓存

### 搜索不工作

1. 检查 Algolia 配置是否正确
2. 确认搜索索引已生成并上传
3. 检查浏览器控制台是否有错误

### 播客不播放

1. 确认音频文件已上传到正确的 URL
2. 检查浏览器控制台的网络请求
3. 确认音频文件格式为 `.m4a`

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 📄 许可证

MIT License

---

⭐ 如果这个模板对您有帮助，请给个星标！
