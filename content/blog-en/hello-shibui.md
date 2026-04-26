---
title: "Writing a Quiet, Complete Blog with Astro Shibui"
description: "A sample English post for the Astro Shibui template, showing the content structure, hanging images, frontmatter, bilingual routing, RSS, search, and draft behavior."
date: 2026-01-01
tags: ["sample", "template", "Astro"]
categories: ["Sample", "Writing Workflow"]
toc: true
draft: false
feature: true
lang: "en"
podcast: false
tldr:
  - "Put posts in content/blog-zh or content/blog-en."
  - "Use image titles such as align-left or align-right to create hanging images."
  - "Use frontmatter to control titles, dates, tags, categories, related reading, featured posts, and drafts."
  - "Configure site.config.js and environment variables to enable search, comments, analytics, and RSS metadata."
---

Welcome to Astro Shibui. This post is not just filler text. It is a practical sample you can open, copy, and reshape while learning how the template works. The core idea is simple: you write Markdown, and the template turns it into a homepage, archive pages, tag pages, category pages, RSS feeds, a search index, and bilingual article routes.

![Astro Shibui default site image](/images/site-feature-image.svg "align-right")

## Hanging Images Are a Core Feature

Astro Shibui supports hanging images on article pages. They are useful for long essays with screenshots, book covers, diagrams, or side-note-like visual material. Instead of interrupting the reading flow, the image can sit beside the text.

The easiest syntax is to put `align-left` or `align-right` in the Markdown image title:

```md
![This alt text becomes the image caption](/images/site-feature-image.svg "align-right")
```

There are two details to remember. First, the alt text inside the square brackets becomes the caption. Second, `align-right` is not a caption; it is a layout instruction. During build, it becomes `figure.align-right` and is removed from the browser tooltip.

On desktop, the image hangs beside the article body, and the text near it receives a reference such as `Fig. 1`. On mobile, the template moves hanging images into a "Materials" section near the end of the article while leaving a clickable figure reference in the text. That keeps the reading column clean without losing the connection between the image and its context.

For finer control, you can also write HTML directly:

```html
<figure class="align-left">
  <img src="/images/site-feature-image.svg" alt="A sample image showing the template's visual style">
  <figcaption>A sample image showing the template's visual style</figcaption>
</figure>
```

## Start with a Markdown File

Chinese posts live in `content/blog-zh/`. English posts live in `content/blog-en/`. The file name becomes part of the public URL. For example:

```text
content/blog-zh/my-first-note.md
content/blog-en/my-first-note.md
```

If you want the language switcher to connect two translations, the easiest approach is to use the same base file name for both posts. A Chinese post named `my-first-note.md` can pair with an English post named `my-first-note.md`. If you prefer an English suffix, the template also understands a name like `my-first-note-en.md`.

## Frontmatter Controls Publication

Every post begins with frontmatter. Think of it as the control panel for the article:

```yaml
title: "A Post Title"
description: "The summary appears in lists, RSS, and search results."
date: 2026-01-01T09:30:00+08:00
tags: ["sample", "writing"]
categories: ["Sample"]
toc: true
draft: false
feature: true
podcast: false
related:
  - "another-post"
  - "/blog/a-useful-note/"
```

`date` is displayed in the site timezone, and article pages show it down to the minute. `tags` and `categories` create their own index pages. `feature: true` includes the post in the featured section. `toc: true` enables the in-article table of contents.

The most important field is `draft`. When `draft: true`, the post is excluded from public pages, RSS feeds, search indexing, related posts, podcast lists, and writing statistics. That lets you keep unfinished writing in the repository without publishing it by accident.

## How Related Reading Works

The "Related reading" area at the bottom of an article has two sources. The first source is the `related` field you explicitly write in frontmatter. The second source is the template's automatic tag-based fallback. Explicit related posts appear first; tag matches fill the remaining slots.

`related` can be a single string or an array:

```yaml
related: "another-post"
```

```yaml
related:
  - "another-post"
  - "notes/about-writing.md"
  - "/blog/a-useful-note/"
```

The template normalizes these values, so you can use a post id, a file name with `.md`, or a public URL. Chinese posts are matched inside the Chinese collection, and English posts are matched inside the English collection.

One useful detail: related reading is detected in both directions. If post A lists post B in `related`, then A will show B; when B is opened, the template also knows that A points to B and can include A in B's related reading candidates. Draft posts are still excluded.

## Where Site Configuration Lives

Site title, author name, site URL, RSS metadata, podcast settings, and third-party service switches live in `site.config.js`. Environment variables live in `.env` locally or in your deployment platform's environment settings. Common optional integrations include:

- Algolia for search.
- Giscus for comments.
- Umami and Clarity for analytics.

All of them are optional. You can leave them empty and the blog will still build and run.

## Local Development and Deployment

After installing dependencies, start the dev server:

```sh
pnpm install
pnpm dev
```

Build the production site:

```sh
pnpm build
```

If you deploy on Vercel, remember to add the environment variables in the project settings. Vercel will not read your local `.env` file automatically.

## What Kind of Blog This Template Fits

Astro Shibui is designed for long-running writing projects rather than one-off landing pages. Its emphasis is not a loud homepage, but a stable reading system: posts can be read, archived, subscribed to, searched, and maintained over time. Treat it as a quiet writing desk. You write the Markdown; the template handles the structure around it.

When you start your own site, you can delete this sample post or keep it as a reference for syntax and configuration.
