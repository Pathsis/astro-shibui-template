// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { fileURLToPath } from "node:url";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkImageCdn from "./src/lib/remark-image-cdn";
import rehypeImageFigure from "./src/lib/rehype-image-figure";
import rehypeImageAlignment from "./src/lib/rehype-image-alignment";
import rehypeImageOptimize from "./src/lib/rehype-image-optimize";
import rehypeExternalLinks from "./src/lib/rehype-external-links";
import rehypeInternalReloadLinks from "./src/lib/rehype-internal-reload-links";
import rehypeLocalizeFootnotes from "./src/lib/rehype-localize-footnotes";
import { siteConfig } from "./site.config.js";

/** @type {any} */
const rehypeKatexPlugin = rehypeKatex;
const isProduction = process.env.NODE_ENV === "production";
const notoSerifWeights = /** @type {[number, ...number[]]} */ ([400, 700]);
const notoSerifSubsets = /** @type {[string, ...string[]]} */ (["latin"]);
const notoSerifFallbacks = /** @type {[string, ...string[]]} */ (["Georgia", "serif"]);

const enableGoogleFonts = process.env.PUBLIC_ENABLE_GOOGLE_FONTS === "true";

const fonts = enableGoogleFonts
  ? [
      {
        name: "Noto Serif SC",
        cssVariable: "--font-noto-serif-sc",
        provider: fontProviders.google(),
        weights: notoSerifWeights,
        subsets: notoSerifSubsets,
        fallbacks: notoSerifFallbacks,
      },
    ]
  : [];

export default defineConfig({
  site: siteConfig.siteUrl,
  compressHTML: true,
  prefetch: false,
  vite: {
    resolve: {
      alias: {
        "@site-config": fileURLToPath(new URL("./site.config.js", import.meta.url)),
        "@content-pages": fileURLToPath(new URL("./content/pages", import.meta.url)),
      },
    },
  },
  integrations: [
    preact(),
    sitemap({
      i18n: {
        defaultLocale: "zh-cn",
        locales: {
          "zh-cn": "zh-CN",
          en: "en",
        },
      },
    }),
  ],
  build: {
    format: "directory",
  },
  fonts,
  devToolbar: {
    enabled: !isProduction,
  },
  i18n: {
    locales: ["zh-cn", "en"],
    defaultLocale: "zh-cn",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: [remarkImageCdn, remarkMath],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, {
          behavior: "wrap",
          properties: { class: "heading-anchor" },
        }],
        rehypeLocalizeFootnotes,
        rehypeImageFigure,
        rehypeImageAlignment,
        rehypeImageOptimize,
        [rehypeInternalReloadLinks, { site: siteConfig.siteUrl }],
        [rehypeExternalLinks, { site: siteConfig.siteUrl }],
        rehypeKatexPlugin,
      ],
    }),
  },
});
