import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const LIB_ROOT = path.join(ROOT, "theme/src/lib");
const TEMPLATE_LIB_ROOT = path.join(ROOT, "src/lib");
const libRoot = existsSync(LIB_ROOT) ? LIB_ROOT : TEMPLATE_LIB_ROOT;
const imagePathLib = await import(pathToFileURL(path.join(libRoot, "image-path.ts")).href);
const publicRootLib = await import(pathToFileURL(path.join(libRoot, "public-root.ts")).href);
const socialImageLib = await import(pathToFileURL(path.join(libRoot, "social-image.ts")).href);
const {
  extractFirstImageFromMarkdown,
  normalizeImagePath,
} = imagePathLib;
const { resolvePublicRoot } = publicRootLib;
const {
  getGeneratedMediaArtworkPath,
  getGeneratedSocialImagePath,
  isRemoteSocialImage,
} = socialImageLib;
const CONTENT_DIRS = [
  path.join(ROOT, "content/blog-zh"),
  path.join(ROOT, "content/blog-en"),
].filter((dir) => existsSync(dir));
const PUBLIC_DIR = resolvePublicRoot(ROOT);
const SOCIAL_OUTPUT_DIR = path.join(PUBLIC_DIR, "generated/social");
const MEDIA_OUTPUT_DIR = path.join(PUBLIC_DIR, "generated/media");
const IMAGE_EXT = /\.(?:avif|gif|jpe?g|png|webp|svg)$/i;

function normalizeLocalImagePath(input: string): string {
  const [withoutQuery] = input.trim().split(/[?#]/);
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
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

function getPagePathForMarkdown(filePath: string): string | undefined {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const contentRoot = `${ROOT.replace(/\\/g, "/")}/content/`;
  if (!normalizedPath.startsWith(contentRoot)) return undefined;

  const relativeToContent = normalizedPath.slice(contentRoot.length);
  const isEnglish = relativeToContent.startsWith("blog-en/");
  const isChinese = relativeToContent.startsWith("blog-zh/");
  if (!isEnglish && !isChinese) return undefined;

  const prefix = isEnglish ? "blog-en/" : "blog-zh/";
  const id = relativeToContent
    .slice(prefix.length)
    .replace(/\.(md|mdx)$/i, "");

  return isEnglish ? `/en/blog/${id}/` : `/blog/${id}/`;
}

function extractPrimaryImage(fileContent: string): string | undefined {
  const { data, content } = matter(fileContent);
  if (Array.isArray(data.images) && typeof data.images[0] === "string") {
    return normalizeImagePath(data.images[0]);
  }

  return extractFirstImageFromMarkdown(content);
}

async function readImageInput(imageRef: string): Promise<Buffer | string | null> {
  if (isRemoteSocialImage(imageRef)) {
    const response = await fetch(imageRef);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const sourcePath = resolveSourcePath(imageRef);
  if (!existsSync(sourcePath)) return null;
  return sourcePath;
}

async function isGeneratedCurrent(outputPath: string, imageRef: string): Promise<boolean> {
  if (!existsSync(outputPath)) return false;
  if (isRemoteSocialImage(imageRef)) return true;

  const sourcePath = resolveSourcePath(imageRef);
  if (!existsSync(sourcePath)) return true;
  const [sourceStat, outputStat] = await Promise.all([stat(sourcePath), stat(outputPath)]);
  return outputStat.mtimeMs >= sourceStat.mtimeMs;
}

async function generateSocial(imageRef: string, pagePath?: string): Promise<"generated" | "skipped"> {
  const outputPath = path.join(
    PUBLIC_DIR,
    getGeneratedSocialImagePath(imageRef, { variantKey: pagePath }).slice(1),
  );

  if (await isGeneratedCurrent(outputPath, imageRef)) return "skipped";

  const input = await readImageInput(imageRef);
  if (!input) return "skipped";

  await sharp(input)
    .resize(1200, 630, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outputPath);

  return "generated";
}

async function generateMediaArtwork(imageRef: string, pagePath?: string): Promise<"generated" | "skipped"> {
  const outputPath = path.join(
    PUBLIC_DIR,
    getGeneratedMediaArtworkPath(imageRef, { variantKey: pagePath }).slice(1),
  );

  if (await isGeneratedCurrent(outputPath, imageRef)) return "skipped";

  const input = await readImageInput(imageRef);
  if (!input) return "skipped";

  await sharp(input)
    .resize(1024, 1024, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(outputPath);

  return "generated";
}

async function main() {
  await Promise.all([
    mkdir(SOCIAL_OUTPUT_DIR, { recursive: true }),
    mkdir(MEDIA_OUTPUT_DIR, { recursive: true }),
  ]);

  const markdownFiles = (
    await Promise.all(CONTENT_DIRS.map((dir) => walkMarkdownFiles(dir)))
  ).flat();

  const socialImages = new Map<string, { imageRef: string; pagePath?: string }>();
  for (const filePath of markdownFiles) {
    const content = await readFile(filePath, "utf8");
    const image = extractPrimaryImage(content);
    if (!image) continue;
    if (!isRemoteSocialImage(image) && !IMAGE_EXT.test(image.split(/[?#]/)[0] || image)) continue;
    const pagePath = getPagePathForMarkdown(filePath);
    const key = `${pagePath || ""}::${image}`;
    socialImages.set(key, { imageRef: image, pagePath });
  }

  let socialGenerated = 0;
  let socialSkipped = 0;
  let mediaGenerated = 0;
  let mediaSkipped = 0;

  for (const { imageRef, pagePath } of socialImages.values()) {
    try {
      const socialResult = await generateSocial(imageRef, pagePath);
      if (socialResult === "generated") socialGenerated += 1;
      else socialSkipped += 1;

      const mediaResult = await generateMediaArtwork(imageRef, pagePath);
      if (mediaResult === "generated") mediaGenerated += 1;
      else mediaSkipped += 1;
    } catch (error) {
      console.warn(`[social-image] failed: ${pagePath || "unknown-page"} -> ${imageRef}`);
      console.warn(error);
    }
  }

  console.log(
    `[social-image] source images: ${socialImages.size}, social generated: ${socialGenerated}, social skipped: ${socialSkipped}, media generated: ${mediaGenerated}, media skipped: ${mediaSkipped}`,
  );
}

main().catch((error) => {
  console.error("[social-image] fatal error");
  console.error(error);
  process.exit(1);
});
