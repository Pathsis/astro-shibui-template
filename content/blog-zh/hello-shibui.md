---
title: "用 Astro Shibui 写一个安静、完整的博客"
description: "一篇随模板附带的中文示例文章，展示 Astro Shibui 的内容结构、悬挂图片、文章元数据、双语路径、Podcast、RSS、搜索和草稿机制。"
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
  - "用 frontmatter 控制标题、日期、标签、分类、相关阅读、Podcast、精选和草稿状态。"
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

如果你想让中英文文章互相切换，必须让它们使用同一个文章 id。当前模板的文章 id 就是文件名去掉 `.md` 或 `.mdx` 后的值，所以中文文章 `content/blog-zh/my-first-note.md` 应该对应英文文章 `content/blog-en/my-first-note.md`。

不要把英文文章随手命名成 `my-first-note-en.md`，除非你真的希望它的文章 id、公开 URL 和播客文件名都包含 `-en`。当前模板不会自动去掉这个后缀。

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

## Podcast 元数据和音频文件如何命名

Podcast 功能只有一个文章元数据字段：

```yaml
podcast: true
```

把它设为 `true` 后，这篇文章会发生几件事：

- 文章标题旁边会出现播放按钮。
- 文章会进入全局 Podcast 播放器列表。
- 列表、精选和相关阅读里的文章标题会带上“可收听播客”的无障碍提示。
- 如果文章是草稿，仍然不会进入 Podcast 列表。

注意，`podcast: true` 不会生成音频文件，也不能指定任意音频 URL。当前模板的音频地址是按固定规则推导出来的：

```js
siteConfig.podcast.audioBaseUrl + "/" + audioKey + ".m4a"
```

你需要先在 `site.config.js` 中配置音频根地址，通常不要在末尾加斜杠：

```js
podcast: {
  audioBaseUrl: "https://cdn.example.com/podcast",
}
```

然后把音频文件上传到这个目录下。假设文章文件是：

```text
content/blog-zh/my-first-note.md
content/blog-en/my-first-note.md
```

那么文章 id 都是 `my-first-note`，对应关系是：

```text
中文文章 URL: /blog/my-first-note/
英文文章 URL: /en/blog/my-first-note/

中文音频文件: https://cdn.example.com/podcast/my-first-note.m4a
英文音频文件: https://cdn.example.com/podcast/my-first-note.en.m4a
```

也就是说，中文音频使用 `<文章 id>.m4a`，英文音频使用 `<文章 id>.en.m4a`。播放器内部会把英文 episode 标记为 `<文章 id>__en`，但这个 `__en` 只是浏览器本地播放状态用的 key，不是文件名，也不是公开 URL。

如果你的英文文章文件名是 `my-first-note-en.md`，它的文章 id 就会变成 `my-first-note-en`，公开页面会是 `/en/blog/my-first-note-en/`，音频文件也会被推导成 `my-first-note-en.en.m4a`。这通常不是你想要的结果。

Podcast 封面图来自文章 frontmatter 的 `images` 第一项：

```yaml
images:
  - /images/my-first-note/cover.webp
```

如果文章没有 `images`，播放器会使用 `site.config.js` 里的 `images.podcastDefaultCover`。如果你把音频放在第三方 CDN、R2 或对象存储上，要确保文件可以公开访问，并返回浏览器能播放的音频类型。当前模板默认寻找 `.m4a` 文件。

如果你需要每篇文章使用完全自定义的音频 URL，当前模板没有提供 frontmatter 字段；更稳妥的做法是在 CDN 上把模板期望的路径重定向到真实文件，或者修改 `src/lib/podcast.ts` 中的 `getPodcastUrl` 逻辑。

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
