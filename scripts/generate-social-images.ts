import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";

const ROOT = process.cwd();
const CONTENT_DIRS = [
  path.join(ROOT, "src/content/blog-zh"),
  path.join(ROOT, "src/content/blog-en"),
];
const PUBLIC_DIR = path.join(ROOT, "public");
const OUTPUT_DIR = path.join(PUBLIC_DIR, "generated/social");
const LOCAL_IMAGE_EXT = /\.(?:avif|gif|jpe?g|png|webp|svg)$/i;

function normalizeLocalImagePath(input: string): string {
  const [withoutQuery] = input.trim().split(/[?#]/);
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

function toSocialImageFileName(localImagePath: string): string {
  const normalized = normalizeLocalImagePath(localImagePath);
  const hash = createHash("sha1").update(normalized).digest("hex").slice(0, 16);
  return `${hash}.jpg`;
}

function resolveSourcePath(localImagePath: string): string {
  const normalized = normalizeLocalImagePath(localImagePath);
  return path.join(PUBLIC_DIR, normalized.slice(1));
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(fullPath)));
      continue;
    }
    if (/\.(?:md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImageFromFrontmatter(fileContent: string): string | undefined {
  const { data } = matter(fileContent);
  if (Array.isArray(data.images) && typeof data.images[0] === "string") {
    return data.images[0];
  }
  return undefined;
}

async function generateOne(localImagePath: string): Promise<"generated" | "skipped"> {
  const sourcePath = resolveSourcePath(localImagePath);
  if (!existsSync(sourcePath)) return "skipped";

  const outputName = toSocialImageFileName(localImagePath);
  const outputPath = path.join(OUTPUT_DIR, outputName);

  if (existsSync(outputPath)) {
    const [sourceStat, outputStat] = await Promise.all([stat(sourcePath), stat(outputPath)]);
    if (outputStat.mtimeMs >= sourceStat.mtimeMs) return "skipped";
  }

  await sharp(sourcePath)
    .resize(1200, 630, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outputPath);

  return "generated";
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const markdownFiles = (
    await Promise.all(CONTENT_DIRS.map((dir) => walkMarkdownFiles(dir)))
  ).flat();

  const localImages = new Set<string>();
  for (const filePath of markdownFiles) {
    const content = await readFile(filePath, "utf8");
    const image = extractImageFromFrontmatter(content);
    if (!image) continue;
    if (!LOCAL_IMAGE_EXT.test(image)) continue;
    if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(image)) continue;
    const normalized = normalizeLocalImagePath(image);
    localImages.add(normalized);
  }

  let generated = 0;
  let skipped = 0;

  for (const localImagePath of localImages) {
    try {
      const result = await generateOne(localImagePath);
      if (result === "generated") generated += 1;
      else skipped += 1;
    } catch (error) {
      console.warn(`[social-image] failed: ${localImagePath}`);
      console.warn(error);
    }
  }

  console.log(
    `[social-image] local images: ${localImages.size}, generated: ${generated}, skipped: ${skipped}`,
  );
}

main().catch((error) => {
  console.error("[social-image] fatal error");
  console.error(error);
  process.exit(1);
});
