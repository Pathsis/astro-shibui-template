---
title: "Complete Guide to Astro Shibui Template: Build Your Blog from Scratch"
description: "A comprehensive guide on using the Astro Shibui template, covering environment setup, feature enablement, content management, and more."
date: 2026-03-13
tags: ["tutorial", "guide", "astro"]
toc: true
categories: ["Tutorial"]
images:
- https://images.unsplash.com/photo-1770983438675-b188d9276ba0?q=80&w=1638&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
---


Welcome to Astro Shibui Template! This is an elegant, minimalist Astro blog template with multilingual support, podcast features, and search functionality. This guide will walk you through using this template to build your blog from scratch.

## Quick Start

### Prerequisites

Make sure you have installed:

- **Node.js** >= 18.x
- **pnpm** >= 8.x (npm/yarn also supported)

### Install Project

```bash
# Clone or download the project
cd astro-shibui-template

# Install dependencies
pnpm install
```

### Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file:

```bash
# Site information
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_SITE_NAME="My Blog"
PUBLIC_SITE_DESCRIPTION="My personal blog"

# Algolia search (optional, configure later)
# ALGOLIA_APP_ID=your_app_id
# ALGOLIA_SEARCH_KEY=your_search_key
# ALGOLIA_INDEX_NAME=your_index_name

# Podcast feature (optional, configure later)
# PUBLIC_PODCAST_ENABLED=false
# PUBLIC_PODCAST_AUDIO_BASE_URL=https://your-cdn.com/
```

### Start Development Server

```bash
pnpm dev
```

Visit http://localhost:4321/ to see your blog!

## Project Structure

Understanding the project structure helps you customize the template better:

```
astro-shibui-template/
├── src/
│   ├── lib/
│   │   └── config.ts          # Core configuration ⭐
│   ├── content/
│   │   ├── blog-zh/           # Chinese posts
│   │   └── blog-en/           # English posts
│   ├── layouts/
│   │   ├── BaseLayout.astro    # Base layout
│   │   └── CoverLayout.astro   # Cover layout
│   ├── components/
│   │   ├── Search.astro       # Search component
│   │   ├── PodcastPlayer.tsx  # Podcast player
│   │   └── ...
│   ├── pages/
│   │   ├── index.astro        # Homepage
│   │   ├── blog/              # Blog pages
│   │   └── ...
│   └── styles/
│       ├── global.css         # Global styles
│       └── podcast-player.css # Podcast styles
├── public/
│   └── images/               # Static image assets
├── .env.example              # Environment variable template
└── astro.config.mjs          # Astro configuration
```

## Core Configuration

### Site Information

Edit `src/lib/config.ts`:

```typescript
export const siteConfig = {
  // Basic info
  name: "My Blog",
  description: "My learning and thoughts",
  author: "Your Name",
  url: "http://localhost:4321",  // Change to your domain in production

  // Multilingual
  locales: {
    default: "zh-cn",
    available: ["zh-cn", "en"],
  },

  // Feature toggles
  features: {
    podcast: {
      enabled: false,  // Enable podcast
      audioBaseUrl: "",
    },
    search: {
      enabled: true,   // Enable search
      provider: "algolia",
    },
  },
};
```

### Multilingual Setup

The template supports Chinese and English:

- **Chinese posts**: Place in `src/content/blog-zh/`
- **English posts**: Place in `src/content/blog-en/`

Language switching works automatically based on URL routing:
- Chinese: `http://localhost:4321/blog/`
- English: `http://localhost:4321/en/blog/`

## Content Management

### Create Posts

Create a new Markdown file in `src/content/blog-zh/`:

```markdown
---
title: "Post Title"
description: "Post description"
date: 2026-03-13
tags: ["tag1", "tag2"]
toc: true  # Show table of contents
images: ["/images/cover.jpg"]  # Cover image (optional)
draft: false  # Draft status
categories: ["Technology"]
---

# Post Title

Post content goes here...
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Post title |
| `description` | string | ❌ | Post description |
| `date` | Date | ✅ | Publish date |
| `tags` | array | ❌ | Tags list |
| `toc` | boolean | ❌ | Show TOC (default false) |
| `images` | array | ❌ | Cover images |
| `draft` | boolean | ❌ | Draft status (drafts won't be published) |
| `categories` | array | ❌ | Categories |
| `podcast` | boolean | ❌ | Has podcast (requires podcast enabled) |

> **Tip**: When `toc: true` is enabled, the template automatically numbers your headings (e.g., 1.1, 1.2, 2.1) and generates a clickable table of contents.

### Image Management

Astro Shibui template provides comprehensive image handling features including cover images, inline images, and social sharing images.

#### 4.3.1 Image Directory Structure

Place images in the `public/images/` directory:

```
public/images/
├── cover.jpg           # Post cover image
├── photo.jpg           # Inline image
├── icons/             # Site icons
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── ...
└── generated/         # Auto-generated social images
    └── social/        # Social sharing images (auto-generated)
```

#### 4.3.2 Cover Images

Set cover image in post frontmatter:

```yaml
---
title: "Post Title"
images: ["/images/cover.jpg"]  # Cover images list
---
```

Cover images appear in:
- 📱 Homepage post cards
- 📄 Article detail page top (if set)
- 🌐 Social media sharing cards

#### 4.3.3 Inline Images

Reference directly in Markdown:

```markdown
![Image description](/images/photo.jpg)
```

**Automatic Features**:
- ✅ **Auto-generate Figure tags**: `<img>` tags are automatically wrapped in `<figure>`
- ✅ **Auto-generate Figcaption**: Alt text is used as image caption
- ✅ **Smart processing**: Images that exist alone in paragraphs are automatically expanded to complete figure structures

For example:
```markdown
![Beautiful landscape](/images/landscape.jpg "Hills at sunset")
```

Automatically converts to:
```html
<figure>
  <img src="/images/landscape.jpg" alt="Beautiful landscape" title="Hills at sunset">
  <figcaption>Beautiful landscape</figcaption>
</figure>
```

#### 4.3.4 Social Sharing Images

The template automatically generates social media sharing images (1200x630):

**Automatic Processing Flow**:
1. 📸 Read cover image from frontmatter `images` field
2. ✂️ Automatically crop and optimize using Sharp
3. 💾 Save to `public/generated/social/` directory
4. 🌐 Use in OG/Twitter Card

**Generation Rules**:
- Format: JPEG (quality: 82)
- Size: 1200x630
- Crop method: cover + attention
- Filename: SHA1 hash based on image path

**Supported Types**:
- Local images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.svg`
- External URLs: Unsplash and other images automatically add crop parameters
- Auto-cache: Unmodified images won't be regenerated

#### 4.3.5 Image Path Processing

The template provides intelligent image path processing:

**Auto-normalization**:
```typescript
// Automatically add leading "/"
images/photo.jpg → /images/photo.jpg
// Keep absolute URLs unchanged
https://example.com/image.jpg → https://example.com/image.jpg
// Keep data URLs unchanged
data:image/png;base64,... → data:image/png;base64,...
```

**Extract Images from Markdown**:
If no cover image is set, the system automatically extracts the first image from article content:
```markdown
Some text...
![First image](/images/first.jpg)
More text...
```
The system will automatically identify and use `/images/first.jpg` as the cover image.

#### 4.3.6 Using External Images as Cover

Use external URLs directly in frontmatter, no need to download images.

```yaml
---
title: "My Post"
images: ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&h=630&q=80"]
---
```

**Supported**: Unsplash, Pexels, Pixabay, Burst - any image URL.

**Getting Unsplash direct image URL**:
1. Find a photo you like on Unsplash
2. Right-click the photo → "Open image in new tab"
3. If it opens the photo detail page, repeat: right-click → "Open image in new tab"
4. Repeat until the browser shows only the pure image (no website elements, like a local image)
5. Copy the URL from the browser address bar, format like:
   ```
   https://images.unsplash.com/photo-xxxxx?auto=format&fit=crop&w=1200&q=80
   ```

**Recommended parameters** (cover):
```bash
?auto=format&fit=crop&w=1200&h=630&q=80
```

**Cover displays at**:
- 📱 Homepage post cards
- 📄 Article detail page top
- 🌐 Social media cards (auto-cropped to 1200x630)

**Usage examples**:

```yaml
---
title: "Using Unsplash"
images: ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&h=630&q=80"]
---

# Article content...
```

```yaml
---
title: "Using Pexels"
images: ["https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?w=1200&h=630"]
---

# Article content...
```

```yaml
---
title: "Using any external URL"
images: ["https://example.com/image.jpg"]
---

# Article content...
```

**Notes**:
- External images depend on network, may not load if service is down
- Most free image libraries allow commercial use, check license
- Recommended to add image source attribution at article end

#### 4.3.7 Image Best Practices

**URL format**:
```bash
https://images.pexels.com/photos/{photo_id}/{image_name}.jpg
```

**Example**:
```yaml
---
images: [
  "https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630"
]
---
```

**Features**:
- ✅ Completely free, commercial use allowed
- ✅ High quality photos
- ✅ CDN supported

#### 2. Pixabay

**URL format**:
```bash
https://pixabay.com/get/{hash}_{image_name}
```

**Example**:
```yaml
---
images: [
  "https://cdn.pixabay.com/photo/2016/11/29/05/45/astronomy-1867616_1280.jpg"
]
---
```

**Features**:
- ✅ Completely free, commercial use allowed
- ✅ SVG and vector graphics supported
- ✅ Provides thumbnails

#### 3. Burst (Shopify)

**URL format**:
```bash
https://burst.shopifycdn.com/photos/{image_name}
```

**Example**:
```yaml
---
images: [
  "https://burst.shopifycdn.com/photos/workspace-setup/343b7e26f6d3a3e04d446e7774613a7.jpg"
]
---
```

**Features**:
- ✅ Official from Shopify, high quality
- ✅ Business friendly
- ✅ No registration needed

### 🔧 Benefits of External Images

**Advantages of using external images**:

1. **Save storage space**: No need to upload images to server
2. **Global CDN**: Leverage image library's CDN
3. **Auto-optimization**: Multiple sizes and formats provided
4. **High quality**: Professional photographer works
5. **Free licensing**: Most are commercially usable
6. **Quick start**: Copy URL and use immediately

#### 4.3.7 Image Best Practices

**Example**:
```markdown
Photo source: Unsplash
```

#### 4.3.7 Image Best Practices

```markdown
---

**Photo source**: Unsplash
**Photographer**: [Photographer Name](https://unsplash.com/@{username})
**License**: Unsplash License
```

#### 4.3.7 Image Best Practices

**Image Optimization**:
1. Compress images: Use [TinyPNG](https://tinypng.com/) or [Squoosh](https://squoosh.app/)
2. Use modern formats: WebP > JPEG > PNG
3. Provide appropriate alt text: Better for SEO and accessibility
4. Use responsive images: Load different sizes for different devices

**Example**:
```yaml
---
title: "My Travel Journal"
description: "Documenting my journey through Europe"
date: 2026-03-13
images: [
  "/images/travel/cover.webp",  # Main cover
  "/images/travel/photo1.jpg",  # Other images
]
toc: true
---

# My European Journey

![Eiffel Tower at sunset](/images/travel/eiffel.webp "Eiffel Tower in Paris")

This was the most memorable moment of my trip...
```

#### 4.3.7 Auto-generate Social Images

Auto-executed during build (`pnpm build`):

```bash
# Prebuild script will:
pnpm run prebuild  # → scripts/generate-social-images.ts
```

**Generation Result Example**:
```
[social-image] local images: 5, generated: 2, skipped: 3
```

- `local images`: Total local images found
- `generated`: Number of newly generated social images
- `skipped`: Existing and unmodified images

#### 4.3.8 External Image Support

Supports external image services like Unsplash:

```yaml
---
images: [
  "https://images.unsplash.com/photo-1234567890"
]
---
```

System automatically adds crop parameters:
```
?auto=format&fit=crop&w=1200&h=630&q=80&fm=jpg
```

#### 4.3.9 Image Version Control

Social sharing images support version control to avoid cache issues:

**Environment Variables**:
```bash
PUBLIC_SOCIAL_IMAGE_VERSION=auto  # Auto-generate
# or
PUBLIC_SOCIAL_IMAGE_VERSION=v1.0  # Manually specify version
```

**Auto Version**:
- Vercel: `VERCEL_GIT_COMMIT_SHA`
- Cloudflare Pages: `CF_PAGES_COMMIT_SHA`
- Build time: `BUILD_TIME`

#### 4.3.10 Common Issues

**Q: Images not showing?**
A: Check the following:
1. Image path is correct (must start with `/`)
2. Image file exists in `public/` directory
3. Image filename is case-sensitive

**Q: Social images not generating?**
A: Ensure:
1. Post frontmatter has `images` field
2. Image path points to local image (external images won't generate)
3. Image format is supported (see section 4.3.5)

**Q: How to disable auto figure generation?**
A: Modify configuration in `src/lib/rehype-image-figure.ts` or remove the plugin.

**Q: How to customize image styles?**
A: Add to `src/styles/global.css`:
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

#### 4.3.11 Advanced Image Processing

**Using Astro Image Component** (optional):

```astro
---
import { Image } from 'astro:assets';
---

<Image 
  src="/images/photo.jpg" 
  alt="Description"
  width={1200}
  height={630}
  format="webp"
  quality={80}
/>
```

**Creating Image Sets**:

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

## Feature Configuration

### Enable Search Function

#### Step 1: Register Algolia

1. Visit [Algolia](https://www.algolia.com/) to sign up
2. Create new Application
3. Create Index
4. Get API Keys

#### Step 2: Configure Environment

Add to `.env`:

```bash
ALGOLIA_APP_ID=your_app_id
ALGOLIA_SEARCH_KEY=your_search_key
ALGOLIA_INDEX_NAME=blog_posts
ALGOLIA_ADMIN_KEY=your_admin_key  # Only for uploading index
```

#### Step 3: Generate and Upload Index

```bash
# Generate search index
pnpm build-index

# Upload to Algolia
pnpm upload-index

# Or do both at once
pnpm algolia
```

Search box will appear automatically on the blog archive page (`/blog/`).

Keyboard shortcut: `Cmd/Ctrl + K` to focus search box quickly.

### Enable Podcast Feature

Podcast is disabled by default. To enable:

#### Step 1: Configure Audio Storage (Cloudflare R2)

Recommended: Use Cloudflare R2 for audio storage (no bandwidth fees).

**Create R2 Bucket**:
1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to R2 → Create bucket, name it like `podcasts`
3. Add custom domain (e.g., `r2.yourdomain.com`), domain must be on Cloudflare
4. Upload audio files

**Audio File Naming**:
- Chinese posts: post slug + `.m4a` (e.g., `my-article.m4a`)
- English posts: post slug + `.en.m4a` (e.g., `my-article.en.m4a`)

**Audio URL Format**:
```
https://r2.yourdomain.com/my-article.m4a
https://r2.yourdomain.com/my-article.en.m4a
```

#### Step 2: Enable Feature Toggle

In `src/lib/config.ts`:

```typescript
features: {
  podcast: {
    enabled: true,
  },
}
```

Add to `.env`:

```bash
# Podcast audio storage URL
PUBLIC_PODCAST_AUDIO_BASE_URL=https://r2.yourdomain.com/
```

> Note: `PUBLIC_PODCAST_AUDIO_BASE_URL` should end with a slash.

#### Step 3: Add Podcast to Posts

Add to post frontmatter:

```yaml
---
title: "Post Title"
podcast: true  # Enable podcast
---
```

#### Step 4: Upload Audio Files

Audio file naming: `{post-slug}.m4a`

Example:
- Post: `hello-world.md`
- Audio: `hello-world.m4a` (Chinese)
- Audio: `hello-world.en.m4a` (English)

Upload audio files to your configured CDN.

The podcast player will appear at the bottom of the page with:
- ▶️ Play/pause
- ⏪ Progress bar
- 🔊 Playback speed (0.5x - 2x)
- 📋 Playlist
- 🔄 Cross-page continuous playback

### Enable Comments (Optional)

The template supports Giscus comments:

1. Enable Discussions on your GitHub repository
2. Visit [Giscus](https://giscus.app/) to configure and get your settings
3. Add to `src/lib/config.ts`:

```typescript
features: {
  comments: {
    enabled: true,
    giscus: {
      repo: "username/repo",           // Your GitHub repo
      repoId: "R_kgDOGxxxx",          // Repo ID (starts with R_)
      category: "Announcements",       // Discussion category
      categoryId: "DIC_kwDOGxxxx",    // Category ID (starts with DIC_)
    },
  },
}
```

#### Comment Display Location

Comments will automatically appear at:
- 📄 Article detail page (bottom)
- Only on Chinese and English article pages
- Not on homepage, archive pages, etc.

#### Custom Comment Styles

Edit `src/components/Giscus.astro` if needed.

## Style Customization

### Theme Colors

Edit `src/styles/global.css`, modify CSS variables:

```css
:root {
  /* Colors */
  --color-bg-primary: light-dark(#faf9f5, #262624);
  --color-bg-secondary: light-dark(hsl(48 25% 92.2% / 1), hsl(60 3% 8% / 1));
  --color-border: light-dark(#e5decf, #4a4037);
  --color-text-primary: light-dark(#000, #faf5f9);
  --color-text-muted: light-dark(#888, #a69885);
}
```

### Font Configuration

#### Web Fonts

Edit `astro.config.mjs`:

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

#### Local Fonts

In `src/styles/global.css`:

```css
:root {
  --font-family-primary: "Your Font", serif;
}
```

### Layout Adjustments

#### Sidebar Width

```css
:root {
  --container-width: 56ch;  /* Content width */
  --sidebar-width: 300px;     /* Sidebar width */
}
```

#### Responsive Breakpoints

The template's responsive layout:

- **≤ 689px**: Single-column layout (mobile), left menu becomes full-screen navigation
- **690px - 1500px**: Two-column layout, both homepage and article pages have left cover + navigation, right content
- **> 1500px**: Three-column layout, article pages display table of contents/sidebar widgets on the right

```css
/* Large screens */
@media screen and (min-width: 1600px) {
  :root {
    --container-width: 60ch;
  }
}

/* Mobile */
@media screen and (max-width: 689px) {
  .content-wrapper {
    max-width: 100%;
  }
}
```

## Advanced Customization

### Custom Components

Create in `src/components/`:

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

### Add New Page Types

For example, create a tag page:

```astro
---
// src/pages/tags/[tag].astro
import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("blog-en");
  const tags = [...new Set(posts.flatMap(post => post.data.tags))];

  return tags.map(tag => ({
    params: { tag },
  }));
}

const { tag } = Astro.params;
---

<CoverLayout title={`Tag: ${tag}`}>
  <h1>Tag: {tag}</h1>
  <!-- Tag post list -->
</CoverLayout>
```

### Integrate Third-party Services

#### Add Umami Analytics

Configure in `.env`:

```bash
PUBLIC_UMAMI_WEBSITE_ID=your-website-id
```

Add scripts in pages as needed (refer to documentation).

#### Add Google Analytics

Create `public/gtag.js`, import in layout.

### Performance Optimization

#### Image Optimization

Use Astro's Image component:

```astro
import { Image } from "astro:assets";

<Image src={imageSrc} alt="Description" />
```

#### Code Splitting

Use `client:idle` or `client:visible` directives:

```astro
<HeavyComponent client:idle />
```

#### Preload Critical Resources

In layout `<head>`:

```html
<link rel="preload" href="/fonts/main.woff2" as="font">
```