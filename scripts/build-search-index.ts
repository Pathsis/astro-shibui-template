/**
 * 生成 Algolia 搜索索引
 *
 * 当 Astro 站点完全独立后，此脚本用于从 Astro 内容集合生成搜索索引
 *
 * 注意：目前索引由 Hugo 站点生成，此脚本暂时不用
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.resolve(PROJECT_ROOT, "src/content");
const OUTPUT_FILE = path.resolve(PROJECT_ROOT, "dist", "algolia.json");

interface SearchRecord {
  objectID: string;
  url: string;
  title: string;
  content: string;
  date: string;
  tags?: string[];
  description?: string;
  language: string;
}

// 递归读取目录下所有 .md 文件
async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

// 从 markdown 内容中提取纯文本
function extractPlainText(content: string): string {
  return content
    // 移除代码块
    .replace(/```[\s\S]*?```/g, "")
    // 移除行内代码
    .replace(/`[^`]+`/g, "")
    // 移除链接语法
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // 移除图片
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // 移除标题标记
    .replace(/^#+\s+/gm, "")
    // 移除强调标记
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // 移除多余空白
    .replace(/\s+/g, " ")
    .trim();
}

// 从 frontmatter 中提取标题
function extractTitle(frontmatter: Record<string, any>, content: string): string {
  if (frontmatter.title) {
    return String(frontmatter.title).replace(/^['"]|['"]$/g, "").trim();
  }
  // 尝试从内容中提取第一个标题
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : "Untitled";
}

// 格式化日期
function formatDate(date: string | Date): string {
  if (typeof date === "string") {
    return new Date(date).toISOString().split("T")[0];
  }
  return date.toISOString().split("T")[0];
}

async function generateIndex() {
  const records: SearchRecord[] = [];

  // 读取所有 markdown 文件
  const collections = ["blog-zh", "blog-en"];

  for (const collection of collections) {
    const collectionDir = path.join(CONTENT_DIR, collection);
    const files = await getMarkdownFiles(collectionDir);

    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");
      const { data: frontmatter, content: markdown } = matter(content);

      // 根据语言集合构建公开 URL
      const fileSlug = path.basename(file).replace(/\.(md|mdx)$/i, "");
      const publicSlug = collection === "blog-en" && fileSlug.endsWith("-en")
        ? fileSlug.slice(0, -3)
        : fileSlug;
      const url = collection === "blog-en"
        ? `/en/blog/${publicSlug}/`
        : `/blog/${publicSlug}/`;

      // 提取语言
      const language = collection === "blog-zh" ? "zh-cn" : "en";

      const plainContent = extractPlainText(markdown);
      const title = extractTitle(frontmatter, markdown);

      records.push({
        objectID: url,
        url,
        title,
        content: plainContent,
        date: formatDate(frontmatter.date || new Date()),
        tags: frontmatter.tags || [],
        description: frontmatter.description,
        language,
      });
    }
  }

  // 确保输出目录存在
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

  // 写入索引文件
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(records, null, 2));

  console.log(`✅ 搜索索引生成完成！`);
  console.log(`   记录数量: ${records.length}`);
  console.log(`   输出文件: ${OUTPUT_FILE}`);

  // 按语言统计
  const byLang = records.reduce((acc, r) => {
    acc[r.language] = (acc[r.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`   语言分布:`, byLang);
}

generateIndex();
