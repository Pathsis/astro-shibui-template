---
title: "Welcome to Astro Shibui"
description: "Start using this elegant Astro blog template"
date: 2026-03-13
tags: ["example", "tutorial"]
toc: true
---

# Welcome to Astro Shibui 🎉

This is an elegant, minimalist Astro blog template with multilingual support, podcast features, search functionality, and more.

## ✨ Core Features

### 📝 Content Management
- **Article System**: Markdown format with frontmatter support
- **Multilingual**: Chinese and English with automatic switching
- **Categories & Tags**: Flexible content organization
- **TOC Generation**: Auto-generated table of contents
- **Related Posts**: Smart recommendation system
- **Draft Mode**: Drafts won't be published to production

### 🖼️ Image Processing
- **Cover Images**: Support for article cover images
- **Social Images**: Auto-generated 1200x630 social cards
- **Smart Paths**: Automatic image path normalization
- **Auto Figure**: Auto-generated image captions
- **Image Optimization**: Auto-crop and compression

### 🔍 Search Functionality
- **Full-text Search**: Integrated Algolia search
- **Real-time Search**: Debounced for better performance
- **Chinese Support**: IME compatible
- **Keyboard Navigation**: Shortcut key support
- **State Persistence**: Search state persists across pages

### 🎙️ Podcast Features (Optional)
- **AI Narration**: Generate audio for articles
- **Player Controls**: Full playback controls
- **Progress Saving**: Auto-save playback progress
- **Cross-page Playback**: View Transitions support
- **System Controls**: Notification center, lock screen

### 💬 Comments System (Optional)
- **Giscus**: Based on GitHub Discussions
- **No Database**: Directly uses GitHub
- **Multiple Themes**: Light/dark/auto theme support
- **Markdown Support**: Full Markdown formatting

### 🎨 Design
- **Minimalist**: Focus on reading experience
- **Responsive**: Perfect mobile adaptation
- **Dark Mode**: Auto-follows system preference
- **Fast Loading**: Static site generation
- **Privacy First**: No analytics tools

## 🚀 Quick Start

### Configure Site Info

Edit `src/lib/config.ts`:

```typescript
export const siteConfig = {
  name: "My Blog",
  description: "My learning and thoughts",
  author: "Your Name",
  url: "https://myblog.com",
};
```

### Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and set basic info:

```bash
PUBLIC_SITE_URL=https://myblog.com
PUBLIC_SITE_NAME="My Blog"
PUBLIC_SITE_DESCRIPTION="My personal blog"
```

### Create Your First Post

Create `hello-world.md` in `src/content/blog-en/`:

```markdown
---
title: "Hello, World"
description: "This is my first post"
date: 2026-03-13
tags: ["essay"]
toc: true
images: ["/images/cover.jpg"]
---

# Hello, World!

Welcome to my blog. This is my first post, beginning my writing journey.

## Start Writing

Put your thoughts here...
```

### Start Development Server

```bash
pnpm dev
```

Visit http://localhost:4321 to see your blog!

## 📚 Learn More

### Complete Usage Guide

See the detailed usage guide:

- **English Version**: [Complete Guide to Astro Shibui Template](/blog/complete-guide)
- **Chinese Version**: [Astro Shibui 模板完全指南](/zh/blog/complete-guide)

### Deployment Guide

See deployment documentation for deploying to production:

- **Deployment Guide**: [Deployment Guide](/DEPLOYMENT.md)

### Feature Configuration

Configure various features as needed:

- **Search**: Configure Algolia search
- **Podcast**: Configure audio server
- **Comments**: Configure Giscus comments
- **Custom Styles**: Modify CSS variables

## 🎯 Next Steps

1. **Create Content**: Write your first post
2. **Customize Styles**: Adjust colors, fonts, layout
3. **Enable Features**: Configure search, podcast, and other advanced features
4. **Deploy**: Publish your blog to the internet
5. **Iterate**: Improve based on data and feedback

## 💡 Tips

- **Delete this example**: Delete `src/content/blog-en/welcome.md`
- **See more examples**: Reference examples in `complete-guide.md`
- **Use Git**: Commit code regularly
- **Backup content**: Regularly backup `src/content/` directory

---

**Happy blogging, create your beautiful blog today!** 🎉
