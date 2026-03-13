// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import preact from "@astrojs/preact";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeImageFigure from "./src/lib/rehype-image-figure";

/** @type {any} */
const rehypeKatexPlugin = rehypeKatex;

// https://astro.build/config
export default defineConfig({
  // 使用环境变量配置站点 URL，提供默认值
  site: import.meta.env.PUBLIC_SITE_URL || "https://yourdomain.com",
  compressHTML: false,
  integrations: [preact()],
  build: {
    format: "directory",
  },
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
  devToolbar: {
    enabled: false,
  },
  i18n: {
    locales: ["zh-cn", "en"],
    defaultLocale: "zh-cn",
    routing: {
      prefixDefaultLocale: false, // 默认语言 zh-cn 无 /zh-cn/ 前缀
    },
  },
  markdown: {
    syntaxHighlight: false,
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, {
        behavior: "wrap",
        properties: { class: "heading-anchor" },
      }],
      rehypeImageFigure,
      rehypeKatexPlugin,
    ],
  },
});
