import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

// 中文博客集合
const blogZh = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./content/blog-zh" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    toc: z.boolean().default(false),
    images: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    feature: z.boolean().default(false),
    categories: z.array(z.string()).optional(),
    lang: z.literal("zh-cn").default("zh-cn"),
    related: z.union([z.string(), z.array(z.string())]).optional(),
    podcast: z.boolean().default(false), // 是否有 AI 播客音频
    tldr: z.array(z.string()).optional(), // TL;DR 要点列表
  }),
});

// 英文博客集合
const blogEn = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./content/blog-en" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    toc: z.boolean().default(false),
    images: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    feature: z.boolean().default(false),
    categories: z.array(z.string()).optional(),
    lang: z.literal("en").default("en"),
    related: z.union([z.string(), z.array(z.string())]).optional(),
    podcast: z.boolean().default(false), // 是否有 AI 播客音频
    tldr: z.array(z.string()).optional(), // TL;DR 要点列表
  }),
});

export const collections = {
  "blog-zh": blogZh,
  "blog-en": blogEn,
};
