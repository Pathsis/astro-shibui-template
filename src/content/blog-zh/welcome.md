---
title: "欢迎来到 Astro Shibui"
description: "开始使用这个优雅的 Astro 博客模板"
date: 2026-03-13
tags: ["示例", "教程"]
toc: true
---

# 欢迎来到 Astro Shibui 🎉

这是一个优雅、极简的 Astro 博客模板，支持多语言、播客、搜索等功能。

## ✨ 核心特性

### 📝 内容管理
- **文章系统**：Markdown 格式，支持 frontmatter
- **多语言**：中英双语，自动切换
- **分类标签**：灵活的内容组织
- **目录生成**：自动生成文章目录
- **相关推荐**：智能推荐相关文章
- **草稿功能**：草稿不发布到生产

### 🖼️ 图片处理
- **封面图**：支持文章封面图
- **社交图片**：自动生成 1200x630 社交卡片
- **智能路径**：自动归一化图片路径
- **自动 Figure**：自动生成图片说明
- **图片优化**：自动裁剪和压缩

### 🔍 搜索功能
- **全文搜索**：集成 Algolia 搜索
- **实时搜索**：防抖优化
- **中文支持**：IME 兼容
- **键盘导航**：快捷键支持
- **状态持久化**：跨页面恢复搜索状态

### 🎙️ 播客功能（可选）
- **AI 朗读**：为文章生成音频
- **播放器**：完整的播放控制
- **进度保存**：自动保存播放进度
- **跨页播放**：View Transitions 支持
- **系统控制**：通知中心、锁屏

### 💬 评论系统（可选）
- **Giscus**：基于 GitHub Discussions
- **无数据库**：直接使用 GitHub
- **多主题**：支持亮色/暗色
- **Markdown**：完整的 Markdown 支持

### 🎨 界面设计
- **极简风格**：专注于阅读体验
- **响应式**：完美适配移动端
- **深色模式**：自动跟随系统
- **极快加载**：静态站点生成
- **隐私优先**：零分析工具

## 🚀 快速开始

### 配置站点信息

编辑 `src/lib/config.ts`：

```typescript
export const siteConfig = {
  name: "我的博客",
  description: "记录我的学习和思考",
  author: "您的名字",
  url: "https://myblog.com",
};
```

### 配置环境变量

复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

编辑 `.env`，设置基本信息：

```bash
PUBLIC_SITE_URL=https://myblog.com
PUBLIC_SITE_NAME="我的博客"
PUBLIC_SITE_DESCRIPTION="我的个人博客"
```

### 创建第一篇文章

在 `src/content/blog-zh/` 创建 `hello-world.md`：

```markdown
---
title: "您好，世界"
description: "这是我的第一篇文章"
date: 2026-03-13
tags: ["随笔"]
toc: true
images: ["/images/cover.jpg"]
---

# 您好，世界！

欢迎来到我的博客。这是我的第一篇文章，开始我的写作之旅。

## 开始写作

在这里写下您的想法...
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:4321 查看您的博客！

## 📚 深入学习

### 完全使用指南

查看详细的完全使用指南：

- **中文版**：[Astro Shibui 模板完全指南](/blog/complete-guide)
- **英文版**：[Complete Guide to Astro Shibui Template](/en/blog/complete-guide)

### 部署指南

查看部署文档了解如何部署到生产环境：

- **部署指南**：[部署指南](/DEPLOYMENT.md)

### 功能配置

根据需要配置各种功能：

- **搜索功能**：配置 Algolia 搜索
- **播客功能**：配置音频服务器
- **评论功能**：配置 Giscus 评论
- **自定义样式**：修改 CSS 变量

## 🎯 下一步

1. **创建内容**：开始写您的第一篇文章
2. **定制样式**：调整颜色、字体、布局
3. **启用功能**：配置搜索、播客等高级功能
4. **部署上线**：将博客发布到互联网
5. **持续优化**：根据数据和反馈改进

## 💡 提示

- 删除此示例文章：删除 `src/content/blog-zh/welcome.md`
- 查看更多示例：参考 `complete-guide.md` 中的示例
- 使用 Git 管理：定期提交代码
- 备份重要内容：定期备份 `src/content/` 目录

---

**祝您使用愉快，创建出精美的博客！** 🎉
