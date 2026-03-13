import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 中文博客集合
const blogZh = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog-zh" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    toc: z.boolean().default(false),
    images: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    categories: z.array(z.string()).optional(),
    lang: z.literal("zh-cn").default("zh-cn"),
    related: z.string().optional(),
    podcast: z.boolean().default(false), // 是否有 AI 播客音频
  }),
});

// 英文博客集合
const blogEn = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog-en" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    toc: z.boolean().default(false),
    images: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    categories: z.array(z.string()).optional(),
    lang: z.literal("en").default("en"),
    related: z.string().optional(),
    podcast: z.boolean().default(false), // 是否有 AI 播客音频
  }),
});

export const collections = {
  "blog-zh": blogZh,
  "blog-en": blogEn,
};
