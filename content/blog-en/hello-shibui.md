---
title: "Writing a Quiet, Complete Blog with Astro Shibui"
description: "A sample English post for the Astro Shibui template, showing the content structure, frontmatter, bilingual routing, table of contents, images, RSS, search, and draft behavior."
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
  - "Use frontmatter to control titles, dates, tags, categories, featured posts, and drafts."
  - "Configure site.config.js and environment variables to enable search, comments, analytics, and RSS metadata."
---

Welcome to Astro Shibui. This post is not just filler text. It is a practical sample you can open, copy, and reshape while learning how the template works. The core idea is simple: you write Markdown, and the template turns it into a homepage, archive pages, tag pages, category pages, RSS feeds, a search index, and bilingual article routes.

![Astro Shibui default site image](/images/site-feature-image.svg "align-right")

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
```

`date` is displayed in the site timezone, and article pages show it down to the minute. `tags` and `categories` create their own index pages. `feature: true` includes the post in the featured section. `toc: true` enables the in-article table of contents.

The most important field is `draft`. When `draft: true`, the post is excluded from public pages, RSS feeds, search indexing, related posts, podcast lists, and writing statistics. That lets you keep unfinished writing in the repository without publishing it by accident.

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
