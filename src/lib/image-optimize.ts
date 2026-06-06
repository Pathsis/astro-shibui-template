/**
 * image-optimize — 共享图片优化工具
 *
 * 供 rehype 插件和 Astro 组件共同使用的图片优化逻辑：
 * - 读取本地图片尺寸（防止 CLS）
 *
 * 不处理远程图片、SVG、data URI，也不再生成正文/卡片专用变体图。
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { resolvePublicRoot } from "./public-root";

/** 本地栅格图扩展名（不含 SVG） */
const LOCAL_RASTER_RE = /\.(?:avif|gif|jpe?g|png|webp)$/i;

/** 远程 / 协议 URL */
const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

// ----- 缓存层 -----
const DIMS_CACHE = new Map<string, { width: number; height: number } | null>();
export interface ImageMetadata {
  /** 原始图片宽度 */
  width: number;
  /** 原始图片高度 */
  height: number;
}

/**
 * 判断 src 是否为本地可优化的栅格图片路径。
 * 远程 URL、data URI、blob、SVG 均返回 false。
 */
export function isLocalRasterImage(src: string): boolean {
  if (!src) return false;
  if (EXTERNAL_RE.test(src)) return false;
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;
  const cleanPath = src.split(/[?#]/)[0] || src;
  return LOCAL_RASTER_RE.test(cleanPath);
}

/**
 * 读取图片尺寸。结果按文件路径缓存，同一构建中不会重复读取。
 */
export async function readImageDimensions(
  filePath: string,
): Promise<{ width: number; height: number } | null> {
  const cached = DIMS_CACHE.get(filePath);
  if (cached !== undefined) return cached;

  try {
    const buf = readFileSync(filePath);
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) {
      DIMS_CACHE.set(filePath, null);
      return null;
    }
    const dims = { width: meta.width, height: meta.height };
    DIMS_CACHE.set(filePath, dims);
    return dims;
  } catch {
    DIMS_CACHE.set(filePath, null);
    return null;
  }
}

/**
 * 一次性解析本地图片的尺寸信息。
 *
 * 适合 Astro 组件 frontmatter 中调用。
 * 对于非本地图片或处理失败，返回 null。
 */
export async function resolveImageMetadata(
  src: string,
): Promise<ImageMetadata | null> {
  if (!isLocalRasterImage(src)) return null;

  const publicRoot = resolvePublicRoot();
  const normalizedSrc = src.startsWith("/") ? src : `/${src}`;
  const cleanSrc = normalizedSrc.split(/[?#]/)[0] || normalizedSrc;
  const filePath = join(publicRoot, cleanSrc.slice(1));

  if (!existsSync(filePath)) return null;

  const dims = await readImageDimensions(filePath);

  if (!dims) return null;

  return {
    width: dims.width,
    height: dims.height,
  };
}
