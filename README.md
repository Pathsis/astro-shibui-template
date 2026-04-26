# Astro Shibui

一个带有悬挂式媒体布局、双语内容结构与完整主题骨架的 Astro 博客模板。

## 模板特色

- 内置中文与英文双语目录结构
- 已整理好的文章页、归档页、分类页、标签页与精选页
- 支持目录、悬挂式媒体、响应式阅读体验与播客条目展示
- 预留 Algolia 搜索、Giscus 评论、Umami 与 Clarity 的接入位
- 自带默认 branding 资源，便于替换前先完整预览主题效果
- 可直接本地开发，也可直接部署到 Vercel

## 快速上手

```sh
pnpm install
cp .env.example .env
pnpm dev
```

默认开发地址：

- `http://localhost:4321`

## 你最需要修改的地方

### 1. 站点配置

编辑 `site.config.js`，修改以下内容：

- 站点标题
- 站点描述
- 作者名
- 站点 URL
- RSS / 联系方式
- 如果需要，也可以修改播客相关配置

### 2. 内容

将模板自带的示例内容替换为你自己的内容：

- `content/blog-zh/`：中文文章
- `content/blog-en/`：英文文章
- `content/pages/`：About 等独立页面

### 3. 品牌资源

如果你想替换模板自带的默认视觉资源，可以修改：

- `public/images/icons/`
- `public/images/`

当前自带的 branding 只是默认预览资源，你可以自由替换。

### 4. 环境变量

复制 `.env.example` 为 `.env`，然后按需填写你要启用的服务。

常见可选项包括：

- Algolia 搜索
- Giscus 评论
- Umami 统计
- Microsoft Clarity

如果这些变量留空，博客依然可以运行，只是对应功能不会启用。

## 配置说明

### 搜索

归档页和搜索相关功能可通过以下变量接入 Algolia：

- `PUBLIC_ALGOLIA_APP_ID`
- `PUBLIC_ALGOLIA_SEARCH_KEY`
- `PUBLIC_ALGOLIA_INDEX_NAME`

如果这些变量缺失，搜索 UI 会回退到“未配置”状态。

### Podcast

在文章 frontmatter 中设置：

```yaml
podcast: true
```

即可让文章标题旁出现播放按钮，并把文章加入全局 Podcast 播放列表。

音频文件不会由模板生成。模板会根据文章 id 和 `site.config.js` 中的 `podcast.audioBaseUrl` 自动推导音频地址：

- 中文文章：`<audioBaseUrl>/<post-id>.m4a`
- 英文文章：`<audioBaseUrl>/<post-id>.en.m4a`

例如：

```js
podcast: {
  audioBaseUrl: "https://cdn.example.com/podcast",
}
```

如果文章文件是 `content/blog-zh/my-first-note.md` 和 `content/blog-en/my-first-note.md`，则应上传：

```text
https://cdn.example.com/podcast/my-first-note.m4a
https://cdn.example.com/podcast/my-first-note.en.m4a
```

中英文文章互相匹配依赖相同文章 id。不要给英文文件随手加 `-en` 后缀，除非你希望公开 URL 和音频文件名也包含这个后缀。

### 评论

文章评论区使用 Giscus。
只要填写完整的 `PUBLIC_GISCUS_*` 变量，评论区就会自动启用。

### 统计

Umami 和 Clarity 都是可选的。
只在对应环境变量存在时才会加载。

## 部署到 Vercel

Vercel 不会自动读取你本地的 `.env` 文件。

部署前，请到：

`Project Settings -> Environment Variables`

把你实际使用的环境变量补进去。

如果你希望启用搜索、评论或统计，至少应检查这些变量是否已经配置：

- `PUBLIC_ALGOLIA_APP_ID`
- `PUBLIC_ALGOLIA_SEARCH_KEY`
- `PUBLIC_ALGOLIA_INDEX_NAME`
- `PUBLIC_GISCUS_REPO`
- `PUBLIC_GISCUS_REPO_ID`
- `PUBLIC_GISCUS_CATEGORY`
- `PUBLIC_GISCUS_CATEGORY_ID`
- `PUBLIC_UMAMI_SCRIPT_SRC`
- `PUBLIC_UMAMI_WEBSITE_ID`
- `PUBLIC_UMAMI_HOSTS`
- `PUBLIC_CLARITY_PROJECT_ID`
- `PUBLIC_CLARITY_HOSTS`

如果这些变量没有在生产环境中配置，即使本地正常，线上对应功能也不会启用。

## 技术栈

- Astro
- Preact
- TypeScript
- 内容集合与 Markdown 工作流

## 许可证

本模板采用 MIT License 发布。详见仓库中的 `LICENSE` 文件。
