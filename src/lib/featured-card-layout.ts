import path from "node:path";
import sharp from "sharp";
import { resolvePublicRoot } from "./public-root";

const FALLBACK_PATTERN = [
  "featured-card--panorama",
  "featured-card--portrait",
  "featured-card--landscape",
  "featured-card--tall",
  "featured-card--square",
  "featured-card--landscape",
  "featured-card--portrait",
  "featured-card--panorama",
  "featured-card--tall",
  "featured-card--square",
];

const LOCAL_IMAGE_RE = /\.(avif|gif|jpe?g|png|tiff?|webp)$/i;

const getLocalPublicImagePath = (imagePath?: string) => {
  if (!imagePath || !imagePath.startsWith("/") || imagePath.startsWith("//")) return undefined;
  if (!LOCAL_IMAGE_RE.test(imagePath)) return undefined;

  return path.join(resolvePublicRoot(), imagePath.replace(/^\/+/, ""));
};

const getLocalImageRatio = async (imagePath?: string) => {
  const localPath = getLocalPublicImagePath(imagePath);
  if (!localPath) return undefined;

  try {
    const metadata = await sharp(localPath).metadata();
    if (!metadata.width || !metadata.height) return undefined;
    return metadata.width / metadata.height;
  } catch {
    return undefined;
  }
};

const classifyRatio = (ratio: number) => {
  if (ratio >= 2.35) return "featured-card--panorama";
  if (ratio >= 1.25) return "featured-card--landscape";
  if (ratio <= 0.68) return "featured-card--tall";
  if (ratio <= 0.92) return "featured-card--portrait";
  return "featured-card--square";
};

export const getFeaturedCardClass = async (coverImage: string | undefined, index: number) => {
  const ratio = await getLocalImageRatio(coverImage);
  return ratio ? classifyRatio(ratio) : FALLBACK_PATTERN[index % FALLBACK_PATTERN.length];
};
