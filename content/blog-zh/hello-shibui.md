---
title: "用 Astro Shibui 写一个安静、完整的博客"
description: "一篇随模板附带的中文示例文章，展示 Astro Shibui 的内容结构、悬挂图片、文章元数据、双语路径、RSS、搜索和草稿机制。"
date: 2026-01-01
tags: ["示例", "模板", "Astro"]
categories: ["示例", "写作工作流"]
toc: true
draft: false
feature: true
lang: "zh-cn"
podcast: false
tldr:
  - "把自己的文章放进 content/blog-zh 或 content/blog-en。"
  - "用图片标题 align-left 或 align-right 创建悬挂图片。"
  - "用 frontmatter 控制标题、日期、标签、分类、相关阅读、精选和草稿状态。"
  - "配置 site.config.js 和 .env 后，就可以接入搜索、评论、统计和 RSS。"
---

欢迎使用 Astro Shibui。这篇文章不是一段占位文字，而是一份可以直接打开、复制、修改的写作示例。它展示了这个模板最重要的使用方式：你只需要写 Markdown，模板会负责把文章组织成首页、归档、标签、分类、RSS、搜索索引和双语页面。

![Astro Shibui 默认站点图](/images/site-feature-image.svg "align-right")

## 悬挂图片是这个模板的重点

Astro Shibui 的文章页支持悬挂图片。它适合长文章中的材料、截图、书影和旁注式图片：图片不会粗暴地打断正文，而是像边注一样悬挂在正文左侧或右侧。

最简单的写法是在 Markdown 图片的 title 里写 `align-left` 或 `align-right`：

```md
![这段 alt 文本会变成图片说明](/images/site-feature-image.svg "align-right")
```

这里有两个细节值得记住。第一，方括号里的 alt 文本会被转换成图片说明。第二，引号里的 `align-right` 不是图片说明，而是布局指令；构建时它会变成 `figure.align-right`，不会作为浏览器 tooltip 显示。

在桌面端，悬挂图片会停在正文旁边，并在附近文字处生成 `图 1` 这样的引用标记。在移动端，模板会把悬挂图片移动到文章后面的“资料”区域，同时在正文中保留可点击的图号引用。这样图片不会挤压手机屏幕上的正文，也不会丢失它和上下文之间的关系。

如果你需要更精细的控制，也可以直接写 HTML：

```html
<figure class="align-left">
  <img src="/images/site-feature-image.svg" alt="一张用于说明模板视觉风格的示例图">
  <figcaption>一张用于说明模板视觉风格的示例图</figcaption>
</figure>
```

## 从一篇 Markdown 开始

中文文章放在 `content/blog-zh/`，英文文章放在 `content/blog-en/`。文件名会成为文章 URL 的一部分。例如：

```text
content/blog-zh/my-first-note.md
content/blog-en/my-first-note.md
```

如果你想让中英文文章互相切换，最简单的方式是让它们使用同一个基础文件名。中文文章 `my-first-note.md` 会对应英文文章 `my-first-note.md`；如果你习惯给英文文件加 `-en` 后缀，模板也会处理 `my-first-note-en.md` 这种命名。

## 元数据决定文章如何出现

每篇文章顶部都有一段 frontmatter。它像文章的控制面板：

```yaml
title: "一篇文章的标题"
description: "文章摘要会出现在列表、RSS 和搜索结果里。"
date: 2026-01-01T09:30:00+08:00
tags: ["示例", "写作"]
categories: ["示例"]
toc: true
draft: false
feature: true
podcast: false
related:
  - "another-post"
  - "/blog/a-useful-note/"
```

`date` 会按站点时区显示，并且文章页会精确到分钟。`tags` 和 `categories` 会生成对应页面。`feature: true` 会把文章放入精选列表。`toc: true` 会启用正文目录。

最重要的是 `draft`：如果你把它设为 `true`，这篇文章就不会出现在公开页面、RSS、搜索索引、推荐文章、播客列表和写作统计里。这让你可以把未完成的草稿留在仓库中，而不必担心构建时泄漏。

## 相关阅读如何指定

文章页底部的“相关阅读”有两层来源。第一层是你在 frontmatter 中显式写出的 `related`。第二层是模板根据标签自动补充的文章。显式指定的文章会优先出现，标签匹配用于补齐列表。

`related` 可以写成一个字符串，也可以写成数组：

```yaml
related: "another-post"
```

```yaml
related:
  - "another-post"
  - "notes/about-writing.md"
  - "/blog/a-useful-note/"
```

模板会把这些值规范化，所以你可以写文章 id、带 `.md` 的文件名，或者公开 URL。中文文章会在中文集合里查找，英文文章会在英文集合里查找。

还有一个方便的细节：相关阅读是双向识别的。如果 A 的 `related` 写了 B，那么打开 A 会看到 B；打开 B 时，模板也会知道 A 指向了 B，并把 A 纳入 B 的相关阅读候选。草稿文章依然会被排除。

## 站点配置放在哪里

站点标题、作者名、站点 URL、RSS 信息、播客音频地址和第三方服务入口都集中在 `site.config.js`。环境变量则放在 `.env` 或部署平台的环境变量设置中。常见配置包括：

- Algolia：用于搜索。
- Giscus：用于文章评论。
- Umami 和 Clarity：用于访问统计。

这些服务都是可选的。你可以先不配置它们，站点仍然可以正常运行。

## 本地开发和部署

安装依赖后运行：

```sh
pnpm install
pnpm dev
```

构建生产版本：

```sh
pnpm build
```

如果你使用 Vercel，记得在项目设置里补齐需要的环境变量。Vercel 不会自动读取你本地的 `.env` 文件。

## 这套模板适合怎样的博客

Astro Shibui 更适合长期写作，而不是一次性的展示页。它的重点不是制造一个夸张的首页，而是让文章可以被稳定地阅读、归档、订阅、搜索和维护。你可以把它当成一个安静的写作工作台：写作时只管 Markdown，发布时让模板把结构性的事情做好。

当你开始自己的站点时，可以直接删除这篇示例文章，或者保留它作为语法和配置的参考。
