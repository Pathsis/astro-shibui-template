---
title: "Astro Shibui 模板完全指南：从零开始搭建您的博客"
description: "详细介绍如何使用 Astro Shibui 模板搭建博客，包括环境配置、功能启用、内容管理等全流程"
date: 2026-03-13
tags: ["教程", "入门指南", "Astro"]
toc: true
categories: ["教程"]
images:
- https://images.unsplash.com/photo-1770983438675-b188d9276ba0?q=80&w=1638&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
---


欢迎来到 Astro Shibui 模板！这是一个优雅、极简的 Astro 博客模板，支持多语言、播客、搜索等功能。本文将详细介绍如何从零开始使用这个模板搭建您的博客。

## 快速开始

### 前置要求

在开始之前，请确保您已经安装了：

- **Node.js** >= 18.x
- **pnpm** >= 8.x（推荐使用 pnpm，也支持 npm/yarn）

### 安装项目

如果您是通过 GitHub Template 创建的项目：

```bash
# 克隆或下载项目
cd astro-shibui-template

# 安装依赖
pnpm install
```

### 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置基本配置：

```bash
# 站点基本信息
PUBLIC_SITE_URL=http://localhost:4321  # 开发环境用这个
PUBLIC_SITE_NAME="我的博客"
PUBLIC_SITE_DESCRIPTION="我的个人博客"

# Algolia 搜索（可选，稍后配置）
# ALGOLIA_APP_ID=your_app_id
# ALGOLIA_SEARCH_KEY=your_search_key
# ALGOLIA_INDEX_NAME=your_index_name

# 播客功能（可选，稍后配置）
# PUBLIC_PODCAST_ENABLED=false
# PUBLIC_PODCAST_AUDIO_BASE_URL=https://your-cdn.com/
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:4321/ 查看您的博客！

## 项目结构

了解项目结构有助于您更好地定制模板：

```
astro-shibui-template/
├── src/
│   ├── lib/
│   │   └── config.ts          # 核心配置文件 ⭐
│   ├── content/
│   │   ├── blog-zh/           # 中文文章
│   │   └── blog-en/           # 英文文章
│   ├── layouts/
│   │   ├── BaseLayout.astro    # 基础布局
│   │   └── CoverLayout.astro   # 封面布局
│   ├── components/
│   │   ├── Search.astro       # 搜索组件
│   │   ├── PodcastPlayer.tsx  # 播客播放器
│   │   └── ...
│   ├── pages/
│   │   ├── index.astro        # 首页
│   │   ├── blog/              # 博客相关页面
│   │   └── ...
│   └── styles/
│       ├── global.css         # 全局样式
│       └── podcast-player.css # 播客样式
├── public/
│   └── images/               # 静态图片资源
├── .env.example              # 环境变量模板
└── astro.config.mjs          # Astro 配置
```

## 核心配置

### 站点基本信息

编辑 `src/lib/config.ts` 设置您的博客信息：

```typescript
export const siteConfig = {
  // 基本信息
  name: "我的博客",
  description: "记录我的学习和思考",
  author: "您的名字",
  url: "http://localhost:4321",  // 生产环境改为您的域名

  // 多语言配置
  locales: {
    default: "zh-cn",
    available: ["zh-cn", "en"],
  },

  // 功能开关
  features: {
    podcast: {
      enabled: false,  // 是否启用播客
      audioBaseUrl: "",
    },
    search: {
      enabled: true,   // 是否启用搜索
      provider: "algolia",
    },
  },
};
```

### 多语言配置

模板支持中英双语：

- **中文文章**：放在 `src/content/blog-zh/`
- **英文文章**：放在 `src/content/blog-en/`

语言切换会自动根据 URL 路由工作：
- 中文：`http://localhost:4321/blog/`
- 英文：`http://localhost:4321/en/blog/`

## 内容管理

### 创建文章

在 `src/content/blog-zh/` 创建新的 Markdown 文件：

```markdown
---
title: "文章标题"
description: "文章描述"
date: 2026-03-13
tags: ["标签1", "标签2"]
toc: true  # 是否显示目录
images: ["/images/cover.jpg"]  # 封面图片（可选）
draft: false  # 是否为草稿
categories: ["技术"]
related: "another-post"  # 相关文章 slug（可选）
---
```

### Frontmatter 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 文章标题 |
| `description` | string | ❌ | 文章描述 |
| `date` | Date | ✅ | 发布日期 |
| `tags` | array | ❌ | 标签列表 |
| `toc` | boolean | ❌ | 是否显示目录（默认 false） |
| `images` | array | ❌ | 封面图片列表 |
| `draft` | boolean | ❌ | 是否为草稿（草稿不会发布） |
| `categories` | array | ❌ | 分类列表 |
| `podcast` | boolean | ❌ | 是否有播客（需启用播客功能） |
| `related` | string | ❌ | 相关文章 ID |
| `featured_layout` | boolean | ❌ | 特殊布局（首页封面） |

### 目录生成（TOC）

启用目录后，系统会自动为文章内的二级、三级等标题添加序号（如 1.1、1.2、2.1），同时生成可点击的目录。

**自动生成**：
- ✅ 从 H2-H6 标题生成目录
- ✅ 标题自动添加序号
- ✅ 自动添加锚点链接
- ✅ 点击目录滚动到对应位置
- ✅ 自动高亮当前阅读位置

**显示位置**：
- 📄 文章详情页侧边栏（桌面端）
- 📱 文章详情页元数据下方（移动端）

**使用方法**：

```yaml
---
title: "长篇文章"
toc: true  # 启用目录
---

# 文章标题

## 第一章节

这是第一章的内容...

### 子节

子章节的内容...

## 第二章节

这是第二章的内容...
```

**目录样式定制**：

目录样式由 `src/styles/global.css` 控制：

```css
.toc {
  position: sticky;
  top: 2rem;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
}

.toc-title {
  font-weight: bold;
  margin-bottom: 1rem;
}

.toc-list {
  list-style: none;
  padding: 0;
}

.toc-list li {
  margin-bottom: 0.5rem;
}

.toc-list a {
  color: var(--color-text-primary);
  text-decoration: none;
  display: block;
  padding: 0.25rem 0;
  border-left: 2px solid transparent;
  padding-left: 0.75rem;
}

.toc-list a:hover {
  border-left-color: var(--color-border);
  background: var(--color-bg-secondary);
}
```

### 相关文章推荐

模板会自动显示相关文章推荐：

**推荐规则**：

1. **优先使用 `related` 字段**：
   - 如果在 frontmatter 中指定了 `related` 字段
   - 系统会直接推荐该文章
   - 无需匹配标签

2. **回退到标签匹配**：
   - 如果未指定 `related` 字段
   - 系统使用文章的第一个标签
   - 推荐该标签下最新的文章

**使用方法**：

**方法 1：明确指定相关文章**：

```yaml
---
title: "React 入门"
tags: ["前端", "React"]
related: "react-best-practices"  # 推荐 slug
toc: true
---
```

**方法 2：基于标签推荐**：

```yaml
---
title: "React 入门"
tags: ["前端", "React"]
toc: true
---
```

系统会自动推荐标签为 "前端" 的最新文章。

**显示内容**：
- 📰 文章标题
- 📅 发布日期
- 📝 文章摘要（自动提取）
- ⏱️ 阅读时间（自动估算）
- 🎙️ 播客提示（如果有）

### 字数统计和阅读时间

模板会自动计算并显示：

**统计信息**：

- 📊 文章字数（按语言规则）
- ⏱️ 预估阅读时间
- 📅 发布日期

**显示位置**：

- 📄 文章详情页：侧边栏
- 🏠 首页：文章卡片（可选）

**字数统计规则**：

- **中文**：每个汉字计为 1 个字
  - 不计算标点符号
  - 不计算空格

- **英文**：每个单词计为 1 个词
  - 以空格分隔
  - 不计算标点符号

**阅读时间估算**：

- **中文**：字数 / 380（每分钟）
- **英文**：单词数 / 220（每分钟）

例如：
- 中文 1900 字 ≈ 5 分钟
- 英文 1100 词 ≈ 5 分钟

**自定义计算**：

编辑 `src/lib/word-count.ts`：

```typescript
export function countWords(content: string, lang: string): number {
  // 自定义字数统计逻辑
  if (lang === "zh-cn") {
    // 中文统计
    return content.replace(/[^\u4e00-\u9fa5]/g, "").length;
  } else {
    // 英文统计
    return content.split(/\s+/).length;
  }
}

export function formatWordCount(count: number, lang: string): string {
  // 自定义格式化
  if (lang === "zh-cn") {
    return `${count} 字`;
  } else {
    return `${count.toLocaleString()} words`;
  }
}
```

### 文章发布日期

**日期格式**：
- ✅ 支持 ISO 8601 格式：`2026-03-13`
- ✅ 支持各种日期格式（Astro 自动解析）
- ✅ 自动转换为显示格式

**使用方法**：

```yaml
---
date: 2026-03-13  # ISO 格式
# 或
date: "2026-03-13T12:00:00+08:00"  # 带时间
# 或
date: "2026/03/13"  # 其他格式
---
```

**显示格式**：
- 📄 文章详情页：`2026-03-13`
- 📅 RSS：`Wed, 13 Mar 2026 00:00:00 GMT`

### 草稿功能

草稿文章不会发布到生产环境：

**使用方法**：

```yaml
---
draft: true  # 标记为草稿
---

这是草稿内容...
```

**草稿规则**：
- 🚫 草稿不会出现在列表页
- 🚫 草稿不会出现在 RSS 订阅
- 🚫 草稿不会被搜索索引
- ✅ 开发环境可以预览草稿

### 文章分类

使用分类组织文章：

```yaml
---
categories: ["技术", "前端", "React"]
---
```

**分类页面**：
- 按分类查看文章：`/categories/技术/`
- 分类 RSS 订阅：`/categories/技术/feed.xml`

**分类与标签的区别**：
- **分类**：层级结构，更正式
- **标签**：扁平结构，更灵活

#### 标签封面设置

标签页面支持自定义封面图。将图片放在 `public/images/terms/` 目录下，文件名为 `{标签名}.{扩展名}`：

```
public/images/terms/
├── 技术.jpg
├── 哲学.png
└── 生活.webp
```

支持的格式：`.jpg`、`.jpeg`、`.png`、`.webp`

系统会自动查找并显示对应标签的封面图。

### 图片管理

Astro Shibui 模板提供了完整的图片处理功能，包括封面图、文章内图片、社交分享图片等。

#### 4.3.1 图片目录结构

将图片放在 `public/images/` 目录下：

```
public/images/
├── cover.jpg           # 文章封面图
├── photo.jpg           # 文章内图片
├── icons/             # 网站图标
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── ...
└── generated/         # 自动生成的社交图片
    └── social/        # 社交分享图片（自动生成）
```

#### 4.3.2 封面图片

在文章 frontmatter 中设置封面图：

```yaml
---
title: "文章标题"
images: ["/images/cover.jpg"]  # 封面图列表
---
```

封面图会显示在：
- 📱 首页文章卡片
- 📄 文章详情页顶部（如果设置了）
- 🌐 社交媒体分享卡片

#### 4.3.3 文章内图片

在 Markdown 中直接引用：

```markdown
![图片描述](/images/photo.jpg)
```

**自动功能**：
- ✅ **自动生成 Figure 标签**：`<img>` 标签会自动包装在 `<figure>` 中
- ✅ **自动生成 Figcaption**：使用 `alt` 文本作为图片说明
- ✅ **智能处理**：图片在段落中单独存在时，会自动扩展为完整的 figure 结构

例如：
```markdown
![美丽的风景](/images/landscape.jpg "夕阳下的山丘")
```

会自动转换为：
```html
<figure>
  <img src="/images/landscape.jpg" alt="美丽的风景" title="夕阳下的山丘">
  <figcaption>美丽的风景</figcaption>
</figure>
```

#### 4.3.4 社交分享图片

模板会自动生成社交媒体分享图片（1200x630）：

**自动处理流程**：
1. 📸 从 frontmatter 的 `images` 字段读取封面图
2. ✂️ 使用 Sharp 自动裁剪和优化
3. 💾 保存到 `public/generated/social/` 目录
4. 🌐 在 OG/Twitter Card 中使用

**生成规则**：
- 格式：JPEG（quality: 82）
- 尺寸：1200x630
- 裁剪方式：cover + attention
- 文件名：基于图片路径的 SHA1 哈希

**支持类型**：
- 本地图片：`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.svg`
- 外部 URL：Unsplash 等图片会自动添加裁剪参数
- 自动缓存：未修改的图片不会重复生成

#### 4.3.5 图片路径处理

模板提供了智能的图片路径处理：

**自动归一化**：
```typescript
// 自动添加开头的 "/"
images/photo.jpg → /images/photo.jpg
// 保持绝对路径不变
https://example.com/image.jpg → https://example.com/image.jpg
// 保持数据 URL 不变
data:image/png;base64,... → data:image/png;base64,...
```

**从 Markdown 提取图片**：
如果未设置封面图，系统会自动从文章内容中提取第一张图片：
```markdown
这是一段文字...
![这是第一张图](/images/first.jpg)
这是另一段文字...
```
系统会自动识别并使用 `/images/first.jpg` 作为封面图。

#### 4.3.6 使用外部图片作为封面图

直接在 frontmatter 中使用外部 URL，无需下载图片到本地。

```yaml
---
title: "我的文章"
images: ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&h=630&q=80"]
---
```

**支持的图库**：Unsplash、Pexels、Pixabay、Burst 等任何图片 URL。

**获取 Unsplash 直接图片链接**：
1. 在 Unsplash 网站找到喜欢的照片
2. 右键点击照片 → "在新标签页中打开图片"
3. 如果打开的是照片详情页，重复右键 → "在新标签页中打开图片"
4. 直到浏览器显示的是纯图片（无任何网页元素，类似本地图片）
5. 复制浏览器地址栏的 URL，格式类似：
   ```
   https://images.unsplash.com/photo-xxxxx?auto=format&fit=crop&w=1200&q=80
   ```

**推荐参数**（封面图）：
```bash
?auto=format&fit=crop&w=1200&h=630&q=80
```

**封面图会显示在**：
- 📱 首页文章卡片
- 📄 文章详情页顶部
- 🌐 社交媒体分享卡片（自动裁剪为 1200x630）

**使用示例**：

```yaml
---
title: "使用 Unsplash"
images: ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&h=630&q=80"]
---

# 文章内容...
```

```yaml
---
title: "使用 Pexels"
images: ["https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?w=1200&h=630"]
---

# 文章内容...
```

```yaml
---
title: "使用任何外部 URL"
images: ["https://example.com/image.jpg"]
---

# 文章内容...
```

**注意事项**：
- 外部图片依赖网络，图库服务中断时可能无法加载
- 大部分免费图库可商用，使用时注意查看许可协议
- 建议在文章末尾添加图片来源声明

#### 4.3.7 图片最佳实践

**图片优化**：
1. 压缩图片：使用 [TinyPNG](https://tinypng.com/) 或 [Squoosh](https://squoosh.app/)
2. 使用现代格式：WebP > JPEG > PNG
3. 提供合适的 alt 文本：利于 SEO 和无障碍访问
4. 使用响应式图片：不同设备加载不同尺寸

**示例**：
```yaml
---
title: "我的旅行日记"
description: "记录我在欧洲的旅行经历"
date: 2026-03-13
images: [
  "/images/travel/cover.webp",  # 主封面图
  "/images/travel/photo1.jpg",  # 其他图片
]
toc: true
---

# 我的欧洲之旅

![埃菲尔铁塔的日落](/images/travel/eiffel.webp "巴黎的埃菲尔铁塔")

这是我旅行中最难忘的瞬间...
```

#### 4.3.7 自动生成社交图片

在构建时会自动执行（`pnpm build`）：

```bash
# 预构建脚本会：
pnpm run prebuild  # → scripts/generate-social-images.ts
```

**生成结果示例**：
```
[social-image] local images: 5, generated: 2, skipped: 3
```

- `local images`: 找到的本地图片总数
- `generated`: 新生成的社交图片数
- `skipped`: 已存在且未修改的图片数

#### 4.3.8 外部图片支持

支持使用 Unsplash 等外部图片服务：

```yaml
---
images: [
  "https://images.unsplash.com/photo-1234567890"
]
---
```

系统会自动添加裁剪参数：
```
?auto=format&fit=crop&w=1200&h=630&q=80&fm=jpg
```

#### 4.3.9 图片版本控制

社交分享图片支持版本控制，避免缓存问题：

**环境变量**：
```bash
PUBLIC_SOCIAL_IMAGE_VERSION=auto  # 自动生成
# 或
PUBLIC_SOCIAL_IMAGE_VERSION=v1.0  # 手动指定版本
```

**自动版本**：
- Vercel: `VERCEL_GIT_COMMIT_SHA`
- Cloudflare Pages: `CF_PAGES_COMMIT_SHA`
- 构建时间：`BUILD_TIME`

#### 4.3.10 常见问题

**Q: 图片不显示？**
A: 检查以下几点：
1. 图片路径是否正确（必须以 `/` 开头）
2. 图片文件是否存在于 `public/` 目录
3. 图片文件名是否区分大小写

**Q: 社交图片不生成？**
A: 确认：
1. 文章 frontmatter 中有 `images` 字段
2. 图片路径指向本地图片（外部图片不会生成）
3. 图片格式受支持（见 4.3.5 节）

**Q: 如何禁用自动 figure 生成？**
A: 在 `src/lib/rehype-image-figure.ts` 中修改配置，或移除该插件。

**Q: 如何自定义图片样式？**
A: 在 `src/styles/global.css` 中添加：
```css
img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

figure {
  margin: 2rem 0;
}

figcaption {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
```

#### 4.3.11 高级图片处理

**使用 Astro Image 组件**（可选）：

```astro
---
import { Image } from 'astro:assets';
---

<Image 
  src="/images/photo.jpg" 
  alt="描述"
  width={1200}
  height={630}
  format="webp"
  quality={80}
/>
```

**创建图片集**：

```astro
---
import { Image } from 'astro:assets';
const image = {
  src: "/images/hero.jpg",
  alt: "Hero Image",
};
const sizes = [400, 800, 1200];
---

<picture>
  {sizes.map(size => (
    <source 
      media={`(max-width: ${size}px)`} 
      srcset={image.src.replace('.jpg', `-${size}.webp`)} 
    />
  ))}
  <Image {...image} />
</picture>
```

## 功能配置

### 启用搜索功能

Astro Shibui 模板集成了 Algolia 全文搜索，支持实时搜索、中文输入法、键盘导航等功能。

#### 功能特性

**核心功能**：
- 🔍 实时搜索（防抖 300ms）
- 🌏 中英文双语搜索
- ⌨️ 中文输入法支持（IME 兼容）
- ⬆️⬇️ 键盘上下键选择结果
- ⏎ Enter 键打开结果
- ⎹ Esc 键关闭搜索
- 🔗 快捷键 `Cmd/Ctrl + K` 快速聚焦

**搜索结果**：
- 标题高亮显示
- 内容片段预览
- 搜索去重（基于 objectID）
- 每次显示 10 条结果

**搜索体验**：
- 📱 响应式设计
- 🎯 搜索状态持久化（跨页面恢复）
- 🔄 返回时自动恢复搜索状态
- 🖱️ 点击外部关闭搜索
- 📜 滚动锁定（搜索时锁定页面滚动）

#### 步骤1：注册 Algolia

1. 访问 [Algolia](https://www.algolia.com/) 注册账号
2. 创建新的 Application
3. 创建 Index（索引）
4. 配置可搜索属性：
   - `title` - 文章标题
   - `content` - 文章内容
   - `url` - 文章链接
   - `language` - 语言标记
5. 获取 API Keys

#### 步骤2：配置环境变量

在 `.env` 中添加：

```bash
# Algolia 应用 ID
ALGOLIA_APP_ID=your_app_id

# Algolia 搜索密钥（前端使用）
ALGOLIA_SEARCH_KEY=your_search_key

# Algolia 索引名称
ALGOLIA_INDEX_NAME=blog_posts

# Algolia 管理员 API 密钥（仅用于上传索引）
ALGOLIA_ADMIN_KEY=your_admin_key
```

#### 步骤3：生成并上传索引

**生成搜索索引**：

```bash
# 生成索引
pnpm build-index
```

这个脚本会：
1. 扫描所有博客文章（中英文）
2. 提取标题、内容、URL 等信息
3. 生成 Algolia 索引文件
4. 按语言标记文章（`language: "zh-cn"` 或 `language: "en"`）

**上传索引到 Algolia**：

```bash
# 上传到 Algolia
pnpm upload-index
```

**一次性完成**：

```bash
# 生成并上传
pnpm algolia
```

#### 步骤4：搜索位置

搜索框会自动出现在：
- 📄 博客归档页面（`/blog/` 和 `/en/blog/`）
- 🔍 独立搜索页面（`/search/` 和 `/en/search/`）

#### 高级配置

**自定义搜索字段**：

编辑 `scripts/build-search-index.ts`：

```javascript
// 可搜索的字段
const searchableAttributes = [
  'title',    // 标题
  'content',  // 内容
];

// 返回的字段
const attributesToRetrieve = [
  'title',
  'url',
  'language',
];
```

**自定义搜索高亮**：

```javascript
attributesToHighlight: [
  'title',
  'content',
],
highlightPreTag: '<em class="highlight">',
highlightPostTag: '</em>',
```

**自定义内容片段**：

```javascript
attributesToSnippet: [
  'content:30',  // 30 个字符的片段
],
```

#### 搜索快捷键

**快速聚焦搜索**：
- 快捷键：`Cmd/Ctrl + K`
- 效果：
  - 在搜索页：聚焦搜索框
  - 在其他页：跳转到搜索页并聚焦搜索框

**键盘导航**：
- `↑` 上移到上一条结果
- `↓` 下移到下一条结果
- `Enter` 打开当前高亮的结果
- `Esc` 关闭搜索框

#### 搜索状态持久化

**自动保存**：
- 搜索关键词
- 选中的结果索引
- 搜索框的滚动位置

**自动恢复**：
- 从搜索结果页返回时，自动恢复之前的搜索状态
- 有效期：2 小时

#### 搜索样式定制

编辑 `src/components/SearchWidget.module.css`：

```css
/* 修改搜索框样式 */
.searchWidget {
  /* ... */
}

/* 修改搜索结果样式 */
.searchResults {
  /* ... */
}

/* 修改高亮样式 */
.highlight {
  background-color: yellow;
  font-weight: bold;
}
```

#### 禁用搜索功能

如果不需要搜索功能，可以在 `src/lib/config.ts` 中禁用：

```typescript
features: {
  search: {
    enabled: false,  // 禁用搜索
  },
}
```

或在 `.env` 中不配置 Algolia 凭证。

#### 常见问题

**Q: 搜索不显示结果？**
A: 检查：
1. 已生成并上传索引（`pnpm algolia`）
2. Algolia 索引名称正确
3. 环境变量配置正确

**Q: 中文搜索不工作？**
A: 确保：
1. 中文文章设置了 `language: "zh-cn"` 标记
2. Algolia 索引配置了中文分词
3. 浏览器编码正确（UTF-8）

**Q: 搜索时输入法不兼容？**
A: 模板已支持 IME，如果仍有问题：
1. 检查浏览器是否支持
2. 清除浏览器缓存
3. 查看浏览器控制台错误

**Q: 如何更新搜索索引？**
A: 重新生成并上传：
```bash
pnpm algolia
```

#### 搜索性能优化

**索引优化**：
1. 限制返回结果数量：`hitsPerPage: 10`
2. 只搜索需要的字段
3. 使用 Algolia 的缓存功能

**前端优化**：
1. 防抖搜索（300ms）
2. 使用 `lite` 客户端（`algoliasearch/lite`）
3. 延迟加载非关键组件

### 启用播客功能

播客功能为文章提供 AI 朗读功能，支持跨页面连续播放、进度保存等。

#### 功能特性

**核心功能**：
- ▶️ 播放/暂停控制
- ⏪ 进度条拖动
- 🔊 倍速播放（0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x）
- 📋 播放列表（按语言过滤）
- 🔄 跨页面连续播放
- 💾 播放进度自动保存（7 天）
- 🎵 系统媒体控制（通知中心、锁屏）
- 📱 响应式播放器（最小化/展开）

**播客封面图**：
- 自动使用文章封面图
- 如果无封面图，使用默认封面
- 支持中英文不同封面
- 自动优化为系统媒体格式

#### 步骤1：配置音频存储（Cloudflare R2）

推荐使用 Cloudflare R2 存储播客音频文件，特点是无带宽费用。

**创建 R2 存储桶**：
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 R2 → 创建存储桶，名称如 `podcasts`
3. 添加自定义域名（如 `r2.yourdomain.com`），需已完成域名接入 Cloudflare
4. 上传音频文件

**音频文件命名规则**：
- 中文文章：文章 slug + `.m4a`（如 `my-article.m4a`）
- 英文文章：文章 slug + `.en.m4a`（如 `my-article.en.m4a`）

**音频 URL 格式**：
```
https://r2.yourdomain.com/my-article.m4a
https://r2.yourdomain.com/my-article.en.m4a
```

#### 步骤2：启用功能开关

在 `src/lib/config.ts` 中启用播客功能：

```typescript
features: {
  podcast: {
    enabled: true,
  },
}
```

在 `.env` 中添加音频存储 URL：

```bash
# 播客音频存储 URL
PUBLIC_PODCAST_AUDIO_BASE_URL=https://r2.yourdomain.com/
```

> 注意：`PUBLIC_PODCAST_AUDIO_BASE_URL` 应以斜杠结尾。

#### 步骤3：为文章添加播客

在文章 Frontmatter 中添加：

```yaml
---
title: "文章标题"
description: "文章描述"
images: ["/images/cover.jpg"]  # 封面图（用作播客封面）
podcast: true  # 启用播客
---
```

**播客封面图规则**：
1. 优先使用 `images` 字段的第一张图片
2. 如果未设置 `images`，使用默认封面 `/podcast-default-cover.png`
3. 封面图会自动优化为系统媒体格式（Android 等设备）

#### 步骤4：上传音频文件

**音频文件命名规则**：
- 中文：`{文章slug}.m4a`
- 英文：`{文章slug}.en.m4a`

**示例**：
- 文章：`src/content/blog-zh/my-post.md`
- 音频：`https://your-cdn.com/podcasts/my-post.m4a`

- 文章：`src/content/blog-en/my-post.md`
- 音频：`https://your-cdn.com/podcasts/my-post.en.m4a`

> 注意：英文文章只需放在 `blog-en` 目录，文件名不需要加 `-en` 后缀。与中文文章使用相同的文件名，它们会自动配对。

**音频要求**：
- 格式：M4A（AAC 编码）
- 质量：建议 128kbps 或更高
- 时长：建议不超过 2 小时

#### 播放器使用

**文章内播放按钮**：
播客启用的文章会在标题旁显示播放按钮，点击即可播放。

**全局播放器**：
- 固定在页面底部
- 支持最小化（显示小播放器）
- 支持展开（显示完整播放器和列表）
- 使用 View Transitions 实现跨页面持续播放

**播放列表**：
- 显示当前语言的所有播客文章
- 按日期降序排列
- 显示每集的播放进度
- 点击直接跳转到文章

**快捷键**：
- 播放/暂停：点击播放按钮
- 倍速切换：点击倍速显示
- 进度控制：拖动进度条

#### 播放进度管理

**自动保存**：
- 每集的播放进度自动保存到本地存储
- 保存时长：7 天
- 保存信息：当前时间、总时长

**自动恢复**：
- 打开文章时自动恢复上次播放位置
- 切换集时自动恢复该集的进度
- 页面刷新后自动继续播放（如果之前在播放）

**系统媒体控制**：
- 🎧 通知中心播放/暂停
- 🔒 锁屏界面控制
- ⏭️ 前进/后退 15 秒
- 📱 显示专辑、标题、封面

#### 高级配置

**自定义播放器样式**：

编辑 `src/styles/podcast-player.css`：

```css
/* 修改播放器主题色 */
:root {
  --podcast-primary: #4a90e2;
  --podcast-secondary: #f5f5f5;
  --podcast-text: #333;
}
```

**禁用播客封面图**：

如果不想使用文章封面图作为播客封面，可以在文章中不设置 `images` 字段，系统会使用默认封面。

**播客 RSS 订阅**：

虽然模板主要关注音频播放，但您可以手动创建 RSS 订阅：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>您的播客</title>
    <description>播客描述</description>
    <item>
      <title>文章标题</title>
      <description>文章描述</description>
      <enclosure url="https://your-cdn.com/podcasts/slug.m4a" 
                 type="audio/x-m4a" 
                 length="0" />
    </item>
  </channel>
</rss>
```

#### 常见问题

**Q: 播客播放器不显示？**
A: 检查：
1. 在 `config.ts` 中启用了播客功能：`features.podcast.enabled = true`
2. 至少有一篇文章设置了 `podcast: true`
3. 音频文件已上传并可访问

**Q: 播放进度不保存？**
A: 确保：
1. 浏览器允许本地存储
2. 不在隐私浏览模式
3. 检查浏览器控制台是否有错误

**Q: 跨页面播放中断？**
A: 确保在 `astro.config.mjs` 中启用了 View Transitions：
```javascript
export default defineConfig({
  // ...
});
```

**Q: 如何生成音频文件？**
A: 可以使用：
- AI TTS 服务：如 [ElevenLabs](https://elevenlabs.io/)、[OpenAI TTS](https://openai.com/)
- 本地 TTS：如 [Azure TTS](https://azure.microsoft.com/)
- 人工录音

### 启用评论系统

Astro Shibui 模板支持 Giscus 评论系统，基于 GitHub Discussions，无需数据库。

#### 功能特性

**核心功能**：
- 💬 基于 GitHub Discussions 的评论
- 🔐 无需数据库，使用 GitHub 仓库
- 🎨 主题支持（亮色/暗色/自动）
- 🌍 多语言支持
- 📱 响应式设计
- 📧 评论通知（通过 GitHub）

**支持的操作**：
- ✅ 发表评论
- ✅ 回复评论
- ✅ 点赞评论
- ✅ Markdown 支持
- ✅ 语法高亮
- ✅ 表情符号
- ✅ @ 提及其他用户

#### 步骤1：准备 GitHub 仓库

1. 确保您的博客是公开的 GitHub 仓库
2. 在仓库设置中启用 **Discussions**：
   - 进入仓库 Settings → General → Features
   - 勾选 "Discussions"
   - 点击保存

#### 步骤2：配置 Giscus

访问 [Giscus App](https://giscus.app/) 配置：

1. **选择仓库**：
   - 输入您的 GitHub 用户名和仓库名
   - 例如：`username/blog`

2. **选择页面映射**：
   - 选择 "Discussions" 作为讨论存储位置
   - 选择 "pathname" 作为页面标识

3. **选择主题**：
   - 选择您喜欢的外观主题
   - 支持亮色、暗色、自动跟随系统

4. **选择语言**：
   - 选择评论系统语言

5. **获取配置**：
   - 复制生成的配置代码

#### 步骤3：配置环境变量

将 Giscus 配置添加到 `.env`：

```bash
# Giscus 仓库（格式：username/repo）
PUBLIC_GISCUS_REPO="username/blog"

# Giscus 仓库 ID
PUBLIC_GISCUS_REPO_ID="R_kgDOG..."

# Giscus 分类
PUBLIC_GISCUS_CATEGORY="Announcements"

# Giscus 分类 ID
PUBLIC_GISCUS_CATEGORY_ID="DIC_kwDOG..."

# Giscus 主题（可选，默认为 light）
PUBLIC_GISCUS_THEME="light"
```

这些信息可以在 Giscus 配置页面找到。

#### 步骤4：启用功能开关

在 `src/lib/config.ts` 中启用：

```typescript
features: {
  comments: {
    enabled: true,  // 启用评论
    giscus: {
      repo: "您的GitHub仓库",       // 格式：username/repo
      repoId: "R_kgDOGxxxx",       // 仓库 ID（以 R_ 开头）
      category: "Announcements",     // Discussion 分类
      categoryId: "DIC_kwDOGxxxx",  // 分类 ID（以 DIC_ 开头）
    },
  },
}
```

获取配置方法：
1. 访问 [Giscus App](https://giscus.app/)
2. 按照页面指引选择您的仓库和设置
3. 将获得的配置信息填入上面的 `giscus` 配置中

#### 评论显示位置

评论系统会自动显示在：
- 📄 文章详情页（底部）
- 只在中文和英文文章页显示
- 不在首页、归档页等页面显示

#### 自定义评论样式

编辑 `src/components/Giscus.astro`：

```astro
---
const { lang = "zh-cn" } = Astro.props;
---

<div class="giscus-container">
  <script src="https://giscus.app/client.js"
          data-repo="username/blog"
          data-repo-id="R_kgDOG..."
          data-category="Announcements"
          data-category-id="DIC_kwDOG..."
          data-mapping="pathname"
          data-strict="0"
          data-reactions-enabled="1"
          data-emit-metadata="0"
          data-input-position="bottom"
          data-theme="preferred_color_scheme"
          data-lang={lang}
          crossorigin="anonymous"
          async>
  </script>
</div>

<style>
  .giscus-container {
    max-width: var(--container-width);
    margin: 2rem auto;
  }
</style>
```

#### 主题配置

**支持的主题**：

```javascript
// 亮色
data-theme="light"

// 暗色
data-theme="dark"

// 自动跟随系统
data-theme="preferred_color_scheme"

// 透明暗色
data-theme="transparent_dark"

// 自定义主题
data-theme="https://example.com/custom-theme.css"
```

**自定义主题色**：

在 Giscus 配置页面可以选择自定义主题色，或者直接修改：

```javascript
data-theme="cobalt"
data-theme="dracula"
data-theme="github-dark"
data-theme="github-light"
data-theme="high-contrast"
data-theme="holi"
data-theme="gruvbox-dim"
data-theme="monokai"
data-theme="nord"
data-theme="owl"
data-theme="pale-night"
data-theme="solarized-dark"
data-theme="tritan-dark"
data-theme="wolverine"
```

#### 评论数据管理

**数据存储位置**：
- GitHub 仓库的 Discussions 区域
- 所有评论公开可见
- 可通过 GitHub API 访问

**评论同步**：
- 评论数据实时同步
- 支持跨设备访问
- 支持搜索历史评论

**评论通知**：
- 通过 GitHub 通知
- 支持 Email 通知
- 支持 GitHub Mobile 推送

#### 禁用评论功能

如果不需要评论功能，可以在 `src/lib/config.ts` 中禁用：

```typescript
features: {
  comments: {
    enabled: false,  # 禁用评论
  },
}
```

或在特定文章中禁用（通过不显示评论组件）。

#### 替代评论系统

如果您想使用其他评论系统，可以：

**Disqus**：

```astro
<div id="disqus_thread"></div>
<script>
  var disqus_config = function () {
    this.page.url = PAGE_URL;
    this.page.identifier = PAGE_IDENTIFIER;
  };
  (function() {
    var d = document, s = d.createElement('script');
    s.src = 'https://your-site.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
  })();
</script>
```

**其他系统**：
- [Utterances](https://utteranc.es/) - 基于 GitHub Issues
- [Twikoo](https://twikoo.js.org/) - 基于 Vercel Serverless
- [Waline](https://waline.js.org/) - 基于 Vercel Serverless

#### 常见问题

**Q: 评论不显示？**
A: 检查：
1. `features.comments.enabled: true`
2. Giscus 环境变量配置正确
3. GitHub 仓库的 Discussions 已启用
4. 页面是文章详情页

**Q: 评论无法发布？**
A: 确保：
1. 用户已登录 GitHub
2. 用户对仓库有写入权限（公开仓库不需要）
3. 浏览器控制台没有错误

**Q: 如何导入现有评论？**
A: Giscus 不支持导入，但：
1. 可以手动创建 Discussion
2. 或者使用 GitHub API 批量导入
3. 新评论会正常工作

**Q: 如何删除不当评论？**
A: 直接在 GitHub Discussions 中删除或隐藏。

## 样式定制

### 主题颜色

编辑 `src/styles/global.css`，修改 CSS 变量：

```css
:root {
  /* 颜色定义 */
  --color-bg-primary: light-dark(#faf9f5, #262624);
  --color-bg-secondary: light-dark(hsl(48 25% 92.2% / 1), hsl(60 3% 8% / 1));
  --color-border: light-dark(#e5decf, #4a4037);
  --color-text-primary: light-dark(#000, #faf5f9);
  --color-text-muted: light-dark(#888, #a69885);
}
```

### 字体配置

#### 网络字体

编辑 `astro.config.mjs`：

```javascript
fonts: [
  {
    name: "Noto Serif SC",
    cssVariable: "--font-noto-serif-sc",
    provider: fontProviders.google(),
    weights: [400, 700],
    subsets: ["latin"],
    fallbacks: ["Georgia", "serif"],
  },
],
```

#### 本地字体

在 `src/styles/global.css` 中修改：

```css
:root {
  --font-family-primary: "Your Font", serif;
}
```

### 布局调整

#### 侧边栏宽度

```css
:root {
  --container-width: 56ch;  /* 内容宽度 */
  --sidebar-width: 300px;     /* 侧边栏宽度 */
}
```

#### 响应式断点

模板的响应式布局：

- **≤ 689px**：单栏布局（移动端），左侧菜单变成全屏导航
- **690px - 1500px**：二栏布局，首页和文章页都是左侧封面+导航，右侧内容
- **> 1500px**：三栏布局，文章页右侧显示目录/小部件侧边栏

```css
/* 大屏幕 */
@media screen and (min-width: 1600px) {
  :root {
    --container-width: 60ch;
  }
}

/* 移动端 */
@media screen and (max-width: 689px) {
  .content-wrapper {
    max-width: 100%;
  }
}
```

## 高级定制

### 自定义组件

在 `src/components/` 创建新组件：

```astro
---
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<div class="my-component">
  <h2>{title}</h2>
</div>

<style>
  .my-component {
    padding: 1rem;
    background: var(--color-bg-secondary);
  }
</style>
```

### 添加新的页面类型

例如创建标签页面：

```astro
---
// src/pages/tags/[tag].astro
import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("blog-zh");
  const tags = [...new Set(posts.flatMap(post => post.data.tags))];

  return tags.map(tag => ({
    params: { tag },
  }));
}

const { tag } = Astro.params;
---

<CoverLayout title={`标签：${tag}`}>
  <h1>标签：{tag}</h1>
  <!-- 标签文章列表 -->
</CoverLayout>
```

### 集成第三方服务

#### 添加 Umami Analytics

在 `.env` 中配置：

```bash
PUBLIC_UMAMI_WEBSITE_ID=your-website-id
```

在需要的页面添加脚本（参考文档）。

#### 添加 Google Analytics

创建 `public/gtag.js`，然后在布局中引入。

### 性能优化

#### 图片优化

Astro Shibui 模板已集成了完整的图片优化系统：

**自动优化功能**：

1. **社交图片自动生成**：
   - 在构建时自动处理封面图
   - 裁剪为 1200x630 尺寸
   - 压缩为 JPEG 格式（质量 82）
   - 保存到 `public/generated/social/`

2. **图片路径归一化**：
   ```typescript
   // 自动处理各种路径格式
   /images/photo.jpg → /images/photo.jpg
   images/photo.jpg → /images/photo.jpg
   https://example.com/image.jpg → 保持不变
   ```

3. **Unsplash 自动优化**：
   ```typescript
   // 自动添加优化参数
   ?auto=format&fit=crop&w=1200&h=630&q=80&fm=jpg
   ```

**使用 Astro Image 组件**（可选）：

```astro
---
import { Image } from 'astro:assets';
---

<Image 
  src="/images/photo.jpg" 
  alt="描述"
  width={1200}
  height={630}
  format="webp"
  quality={80}
  loading="lazy"
/>
```

**图片懒加载**：
```markdown
![描述](/images/photo.jpg)
```
自动使用 `loading="lazy"` 延迟加载图片。

#### 代码分割

使用 `client:idle` 或 `client:visible` 指令：

```astro
<!-- 延迟加载交互组件 -->
<HeavyComponent client:idle />

<!-- 可见时加载交互组件 -->
<AnalyticsComponent client:visible />

<!-- 总是加载交互组件 -->
<InteractiveComponent client:load />
```

**播客播放器**：
- 使用 `transition:persist` 保持播放器状态
- 仅在有播客文章时加载
- 延迟加载播放器组件

#### 预加载关键资源

在布局的 `<head>` 中添加：

```astro
---
const preloadResources = [
  { href: "/fonts/main.woff2", as: "font", type: "font/woff2" },
  { href: "/images/hero.webp", as: "image" },
];
---

<head>
  {preloadResources.map(resource => (
    <link 
      rel="preload" 
      href={resource.href} 
      as={resource.as} 
      type={resource.type}
    />
  ))}
</head>
```

#### 字体优化

**使用 Google Fonts**（已配置）：

```javascript
// astro.config.mjs
fonts: [
  {
    name: "Noto Serif SC",
    cssVariable: "--font-noto-serif-sc",
    provider: fontProviders.google(),
    weights: [400, 700],
    subsets: ["latin"],
    fallbacks: ["Georgia", "serif"],
  },
],
```

**使用本地字体**（可选）：

1. 将字体文件放到 `public/fonts/` 目录
2. 在 `src/styles/global.css` 中添加：

```css
@font-face {
  font-family: "Custom Font";
  src: url("/fonts/custom.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

:root {
  --font-family-primary: "Custom Font", serif;
}
```

**字体显示策略**：
- `auto`：浏览器默认
- `block`：立即显示（可能导致闪烁）
- `swap`：显示后备字体（推荐）
- `fallback`：短时间显示后备
- `optional`：可选加载

#### 资源压缩

模板已自动启用：
- ✅ HTML 压缩（`compressHTML: false` 可禁用）
- ✅ CSS 优化
- ✅ JS 代码分割
- ✅ 静态资源哈希（缓存破坏）

## 系统功能详解

### 构建信息

模板会在页面底部显示构建信息：

- **构建时间**：始终显示（本地开发显示本地时间，Vercel 部署显示 Vercel 构建时间）
- **Git 提交信息**：仅在 Vercel 部署时显示

**示例**（Vercel 部署时）：
```
构建于 2026/03/13 23:00:00
Fix typo in README
```

**本地开发时**：
```
构建于 2026/03/13 23:00:00
```

#### Vercel 环境变量说明

Vercel 会自动提供以下环境变量：

| 环境变量 | 说明 | 示例值 |
|---------|------|--------|
| `BUILD_TIME` | 构建时间 | `2026-03-13 23:00:00` |
| `VERCEL_GIT_COMMIT_SHA` | Git 提交 SHA | `abc123def456...` |
| `VERCEL_GIT_COMMIT_MESSAGE` | Git 提交信息 | `Fix typo in README` |
| `VERCEL_GIT_PROVIDER` | Git 提供商 | `github` |
| `VERCEL_GIT_REPO_SLUG` | 仓库名称 | `username/repo` |
| `VERCEL_GIT_REPO_OWNER` | 仓库所有者 | `username` |
| `VERCEL_BRANCH` | 部署分支 | `main` |
| `VERCEL_DEPLOYMENT_ID` | 部署 ID | `dpl_xxx` |
| `VERCEL_URL` | 部署 URL | `my-blog.vercel.app` |

这些变量由 Vercel 自动注入，**无需手动配置**。

#### 自定义构建时间格式

如果需要修改构建时间的格式，编辑 `src/layouts/CoverLayout.astro`：

```astro
---
const buildTime = (process.env.BUILD_TIME as string | undefined) ?? 
  new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai'  // 可改为其他时区
  }).replace(/\//g, '/');
---
```

**常用时区**：
- `'Asia/Shanghai'` - 中国时区
- `'UTC'` - 世界统一时间
- `'America/New_York'` - 美国东部时间
- `'Europe/London'` - 英国时间

#### 本地开发时的构建信息

本地开发时，由于没有 Vercel 环境变量，会显示本地构建时间：

```
构建于 2026-03-13 23:00:00
```

如果需要模拟 Vercel 的环境变量，可以在 `.env` 中添加：

```bash
# .env
BUILD_TIME=2026-03-13 23:00:00
VERCEL_GIT_COMMIT_SHA=test123
VERCEL_GIT_COMMIT_MESSAGE=Local test
```

#### 禁用构建信息显示

如果不需要显示构建信息，可以注释掉相关代码：

编辑 `src/layouts/CoverLayout.astro`，找到并注释掉显示构建信息的部分：

```astro
{/* 
<div class="build-info">
  {buildInfoText}
</div>
*/}
```

#### 社交图片版本控制

构建信息还用于社交图片的版本控制，避免缓存问题：

```bash
PUBLIC_SOCIAL_IMAGE_VERSION=auto  # 自动使用 VERCEL_GIT_COMMIT_SHA
```

这会在每次部署时生成新的版本标识，确保社交图片及时更新。

### PWA 配置

模板已包含完整的 PWA 配置：

**配置文件**：`public/site.webmanifest`

**功能支持**：
- ✅ 添加到主屏幕
- ✅ 启动画面
- ✅ 主题色
- ✅ 应用图标
- ✅ 离线功能（可选）

**配置示例**：

```json
{
  "name": "Your Site Name",
  "short_name": "Your Site",
  "description": "Your site description",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#faf9f5",
  "theme_color": "#faf9f5",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/images/icons/favicon-16x16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "/images/icons/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png",
      "purpose": "apple touch icon"
    }
  ]
}
```

**自定义 PWA**：

1. **修改 manifest**：编辑 `public/site.webmanifest`
2. **添加 Service Worker**：创建 `public/sw.js`
3. **注册 Service Worker**：在 `src/layouts/BaseLayout.astro` 中添加

### 页面类型

模板支持多种页面类型，每种类型有不同的布局和行为：

**页面类型**：

1. **首页**（`home`）：
   - 显示文章瀑布流
   - 分页加载
   - 首页封面图（最新文章）

2. **文章详情页**（`article`）：
   - 完整文章内容
   - 目录、相关文章
   - 播客播放按钮（如果有）

3. **归档页**（`section`）：
   - 文章列表（按年份分组）
   - 搜索功能
   - 写作统计

4. **标签页**（`term`）：
   - 特定标签的文章列表
   - 标签统计

5. **分类页**（`taxonomy`）：
   - 特定分类的文章列表
   - 分类统计

6. **搜索页**（`page`）：
   - 独立搜索界面
   - 实时搜索结果

7. **关于页**（`page`）：
   - 自定义内容
   - 订阅链接
   - 写作统计（自动从文章集合计算）

**关于页写作统计**：

模板的关于页已集成写作统计功能，会自动从您的文章集合计算统计数据：

- `<Stats />`：显示文章总数和总字数
- `<WritingChart />`：显示过去12个月的写作图表

这两个组件会动态计算，无需手动配置。每次构建时会自动更新统计数据。

**配置方式**：

```astro
---
import CoverLayout from "../layouts/CoverLayout.astro";

const pageKind = "article";  // 页面类型
---

<CoverLayout 
  title="文章标题"
  pageKind={pageKind}
  toc={true}
>
  <article>
    文章内容...
  </article>
</CoverLayout>
```

**页面类型的作用**：

- 影响布局显示
- 影响搜索索引
- 影响广告显示（如果添加）
- 影响分析追踪

### 首页特殊功能

**首页点击返回**：

点击站点名称可以返回上次的展开和滚动位置：
- 第一次点击：返回上次位置
- 第二次点击：重置分页到第一页

**首页封面图**：

使用最新文章的封面图作为首页封面：

```typescript
// src/pages/[...page].astro
let featuredImage: string | undefined = "/images/terms/about.webp";
let featuredImageSource: "images" | "other" = "other";

if (page.data.length > 0) {
  const latestPost = page.data[0];
  if (latestPost.data.images && latestPost.data.images.length > 0) {
    featuredImage = normalizeImagePath(latestPost.data.images[0]);
    featuredImageSource = "images";
  }
}
```

### 打印优化

模板已优化打印体验：

**自动优化**：
- ✅ 打印前移除文章内链接
- ✅ 打印追踪（可选）
- ✅ 打印样式优化
- ✅ 自动记录打印事件（分析）

**打印样式**：

模板在 `src/layouts/BaseLayout.astro` 中已包含打印优化脚本。

**自定义打印样式**：

```css
@media print {
  /* 隐藏不需要打印的元素 */
  .menu-toggle,
  .sidebar-right,
  .search-widget,
  .podcast-player,
  .comments {
    display: none !important;
  }

  /* 优化文章显示 */
  .gh-content {
    max-width: 100%;
    font-size: 12pt;
    line-height: 1.5;
  }

  /* 图片优化 */
  img {
    max-width: 100%;
    page-break-inside: avoid;
  }

  /* 避免孤立的标题 */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
  }
}
```
