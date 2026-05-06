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
const siteConfigModule = await import(pathToFileURL(path.join(ROOT, "site.config.js")).href);
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
const PODCAST_DEFAULT_COVER = normalizeImagePath(
  siteConfigModule?.siteConfig?.images?.podcastDefaultCover,
);
const JPEG_BACKGROUND = { r: 250, g: 249, b: 245 };
function parseNonNegativeNumber(raw: string | undefined, fallback: number): number {
  if (typeof raw !== "string") return fallback;
  const normalized = raw.trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}
const REMOTE_FETCH_TIMEOUT_MS = parseNonNegativeNumber(process.env.SOCIAL_IMAGE_FETCH_TIMEOUT_MS, 12000);
const REMOTE_IMAGE_REVALIDATE_MS = parseNonNegativeNumber(
  process.env.SOCIAL_IMAGE_REMOTE_TTL_MS,
  24 * 60 * 60 * 1000,
);

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

function extractEntryImage(fileContent: string): { image?: string; podcast: boolean } {
  const { data, content } = matter(fileContent);
  const podcast = data?.podcast === true;
  if (Array.isArray(data.images) && typeof data.images[0] === "string") {
    return { image: normalizeImagePath(data.images[0]), podcast };
  }

  return {
    image: extractFirstImageFromMarkdown(content),
    podcast,
  };
}

async function readImageInput(imageRef: string): Promise<Buffer | string | null> {
  if (isRemoteSocialImage(imageRef)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(1000, REMOTE_FETCH_TIMEOUT_MS));
    try {
      const response = await fetch(imageRef, {
        signal: controller.signal,
        redirect: "follow",
      });
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  const sourcePath = resolveSourcePath(imageRef);
  if (!existsSync(sourcePath)) return null;
  return sourcePath;
}

async function isGeneratedCurrent(outputPath: string, imageRef: string): Promise<boolean> {
  if (!existsSync(outputPath)) return false;
  if (isRemoteSocialImage(imageRef)) {
    const outputStat = await stat(outputPath);
    const maxAge = Math.max(0, REMOTE_IMAGE_REVALIDATE_MS);
    if (maxAge === 0) return false;
    return Date.now() - outputStat.mtimeMs < maxAge;
  }

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
    .flatten({ background: JPEG_BACKGROUND })
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
    .flatten({ background: JPEG_BACKGROUND })
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
    const { image, podcast } = extractEntryImage(content);
    const fallbackImage = podcast ? PODCAST_DEFAULT_COVER : undefined;
    const selectedImage = image ?? fallbackImage;
    const pagePath = getPagePathForMarkdown(filePath);
    if (!selectedImage) continue;
    if (!pagePath) continue;
    if (!isRemoteSocialImage(selectedImage) && !IMAGE_EXT.test(selectedImage.split(/[?#]/)[0] || selectedImage)) continue;
    const key = `${pagePath}::${selectedImage}`;
    socialImages.set(key, { imageRef: selectedImage, pagePath });
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
