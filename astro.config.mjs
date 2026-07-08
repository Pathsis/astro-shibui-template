// @ts-check
import "./env-setup.mjs";
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
// 总开关：设为 false 禁用所有网络字体（包括自托管本地字体），仅使用系统字体栈
// 模板默认 false，因为不含字体文件；用户自行放置后开启 PUBLIC_ENABLE_WEB_FONTS=true
const enableWebFonts = (process.env.PUBLIC_ENABLE_WEB_FONTS ?? "false").toLowerCase() !== "false";

// 自托管本地子集字体（如 STSong）：模板不含字体文件，用户自行放置到
// src/assets/fonts/ 后开启 PUBLIC_ENABLE_WEB_FONTS=true 即可启用。
// 文件不存在时 local provider 会因找不到文件而报错，因此需要存在性检查。
import { existsSync } from "node:fs";
const localFontPath = fileURLToPath(new URL("./src/assets/fonts/STSong.woff2", import.meta.url));
const hasLocalFont = existsSync(localFontPath);

/** @type {any} */
const fonts = enableWebFonts && hasLocalFont
  ? [
      {
        name: "STSong",
        cssVariable: "--font-stsong",
        provider: fontProviders.local(),
        fallbacks: ["Georgia", "serif"],
        options: {
          variants: [
            {
              weight: 400,
              style: "normal",
              src: [localFontPath],
            },
          ],
        },
      },
      ...(enableGoogleFonts
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
        : []),
    ]
  : [];

export default defineConfig({
  site: siteConfig.siteUrl,
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
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
