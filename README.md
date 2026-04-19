# Astro Hang

A bilingual Astro blog template with hanging media, elegant typography, built-in search hooks, and optional comment / analytics integrations.

## Highlights

- Chinese and English content structure out of the box
- Refined article layout with TOC, hanging media, archive pages, and responsive reading experience
- Built-in hooks for Algolia search, Giscus comments, Umami analytics, and Microsoft Clarity
- Default branding assets included so the theme looks complete before customization
- Ready for local development and straightforward Vercel deployment

## Quick Start

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Then open:

- `http://localhost:4321`

## First Things To Customize

### 1. Site Settings

Edit `site.config.js` to set your:

- site title
- site description
- author name
- site URL
- RSS / contact information
- podcast-related settings if needed

### 2. Content

Replace the sample content with your own:

- `content/blog-zh/` for Chinese posts
- `content/blog-en/` for English posts
- `content/pages/` for About and other standalone pages

### 3. Branding

If you want to use your own visual identity, replace assets in:

- `public/images/icons/`
- `public/images/`

The bundled branding is only a default preview layer and can be swapped freely.

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in the services you want to enable.

Common options:

- Algolia search
- Giscus comments
- Umami analytics
- Microsoft Clarity

If you leave them empty, the blog still works, but related features will stay disabled.

## Configuration Notes

### Search

Archive and search-related UI can connect to Algolia through:

- `PUBLIC_ALGOLIA_APP_ID`
- `PUBLIC_ALGOLIA_SEARCH_KEY`
- `PUBLIC_ALGOLIA_INDEX_NAME`

If these are missing, search UI will fall back to an unconfigured state.

### Comments

Article comments use Giscus when the required `PUBLIC_GISCUS_*` variables are provided.

### Analytics

Umami and Clarity are optional and controlled via environment variables.

## Deploying To Vercel

Vercel does not read your local `.env` file automatically.

Before deploying, add your real environment variables in:

`Project Settings -> Environment Variables`

At minimum, check the variables for any feature you want enabled, such as:

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

If these variables are absent in production, related features will not load online even if they work locally.

## Tech Stack

- Astro
- Preact
- TypeScript
- MD / MDX-style content collections

## License

Customize it for your own project and replace content, branding, and third-party service settings as needed.
