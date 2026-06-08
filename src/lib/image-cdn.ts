const ABSOLUTE_URL_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const LOCAL_BASE_URL = "https://pathos.local";
const GIF_PATH_RE = /\.gif(?:$|[?#])/i;
const UNSPLASH_HOST_RE = /(?:^|\.)unsplash\.com$/i;

const BODY_SRCSET_WIDTHS = [400, 626, 800, 1280] as const;
const ARTICLE_IMAGE_SIZES = "(max-width: 768px) 100vw, 626px";

/** 相关阅读卡片 srcset 宽度：200w (移动 1×) + 400w (桌面 / 移动 2×) */
const CARD_COVER_SRCSET_WIDTHS = [200, 400] as const;
const CARD_COVER_SIZES = "(max-width: 768px) 42vw, 280px";

/** 精选卡片 srcset 宽度：400w (移动) + 800w (桌面 / 高 DPR) */
const FEATURED_COVER_SRCSET_WIDTHS = [400, 800] as const;
const FEATURED_COVER_SIZES = "(max-width: 768px) 100vw, 440px";

/** 相关阅读卡片 <picture>：移动端 2:3 裁切宽度档 */
const CARD_PICTURE_MOBILE_WIDTHS = [200, 400] as const;
/** 相关阅读卡片 <picture>：桌面端 16:9 裁切宽度档 */
const CARD_PICTURE_DESKTOP_WIDTHS = [400, 600] as const;

export type ImageKitScene = "body" | "cover" | "featuredCover";

function readEnv(name: string): string {
  return (process.env[name] || "").trim();
}

function getImageKitUrlEndpoint(): string {
  return readEnv("PUBLIC_IMAGEKIT_URL_ENDPOINT").replace(/\/+$/, "");
}

function getImageKitTransformation(): string {
  return readEnv("PUBLIC_IMAGEKIT_TRANSFORMATION") || "f-auto,q-auto,w-1280,c-at_max";
}

function getImageKitBodyTransformation(): string {
  return readEnv("PUBLIC_IMAGEKIT_BODY_TRANSFORMATION") || getImageKitTransformation();
}

function getImageKitCoverTransformation(): string {
  return readEnv("PUBLIC_IMAGEKIT_COVER_TRANSFORMATION") || "f-auto,q-auto,w-400,c-at_max";
}

function getImageKitFeaturedCoverTransformation(): string {
  return readEnv("PUBLIC_IMAGEKIT_FEATURED_COVER_TRANSFORMATION") || "f-auto,q-auto,w-800,c-at_max";
}

function getImageKitGeneratedTransformation(): string {
  return readEnv("PUBLIC_IMAGEKIT_GENERATED_TRANSFORMATION") || "f-auto,q-auto";
}

function getSceneTransformation(scene: ImageKitScene): string {
  switch (scene) {
    case "body":
      return getImageKitBodyTransformation();
    case "cover":
      return getImageKitCoverTransformation();
    case "featuredCover":
      return getImageKitFeaturedCoverTransformation();
  }
}

function getImageKitPathRules() {
  return [
    {
      prefix: "/images/",
      transformation: getImageKitBodyTransformation(),
    },
    {
      prefix: "/generated/social/",
      transformation: getImageKitGeneratedTransformation(),
    },
    {
      prefix: "/generated/media/",
      transformation: getImageKitGeneratedTransformation(),
    },
  ] as const;
}

function resolveLocalUrl(src: string): URL | null {
  try {
    return new URL(src, LOCAL_BASE_URL);
  } catch {
    return null;
  }
}

function pathnameOf(src: string): string {
  const resolved = resolveLocalUrl(src);
  return resolved?.pathname || src.split(/[?#]/)[0] || src;
}

export function isGifImagePath(src?: string): boolean {
  if (!src) return false;
  return GIF_PATH_RE.test(pathnameOf(src));
}

function transformationAtWidth(transformation: string, width: number): string {
  if (/w-\d+/.test(transformation)) {
    return transformation.replace(/w-\d+/, `w-${width}`);
  }
  return `w-${width},${transformation}`;
}

function parseCoverWidth(transformation: string, fallback: number): number {
  const match = transformation.match(/w-(\d+)/);
  return match ? Number(match[1]) : fallback;
}

export function isImageKitEnabled(): boolean {
  if (readEnv("PUBLIC_ENABLE_IMAGE_CDN").toLowerCase() === "false") return false;
  return !!getImageKitUrlEndpoint();
}

export function resolveLocalImagePath(src?: string): string | null {
  if (!src) return null;

  if (isMappableLocalImagePath(src)) {
    const resolved = resolveLocalUrl(src);
    return resolved?.pathname ?? null;
  }

  const endpoint = getImageKitUrlEndpoint();
  if (!endpoint || !src.startsWith(endpoint)) return null;

  try {
    const endpointPath = new URL(endpoint).pathname.replace(/\/$/, "");
    let { pathname } = new URL(src);
    if (endpointPath && pathname.startsWith(endpointPath)) {
      pathname = pathname.slice(endpointPath.length) || "/";
    }
    const localPath = pathname.replace(/^\/tr:[^/]+/, "");
    return isMappableLocalImagePath(localPath) ? localPath : null;
  } catch {
    return null;
  }
}

export function isMappableLocalImagePath(src?: string): boolean {
  if (!src) return false;
  if (ABSOLUTE_URL_RE.test(src)) return false;
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;

  const resolved = resolveLocalUrl(src);
  if (!resolved) return false;
  return getImageKitPathRules().some((rule) => resolved.pathname.startsWith(rule.prefix));
}

export function isUnsplashUrl(src?: string): boolean {
  if (!src) return false;
  try {
    const hostname = new URL(src).hostname;
    return UNSPLASH_HOST_RE.test(hostname);
  } catch {
    return false;
  }
}

export function optimizeExternalCoverUrl(
  src: string,
  options?: {
    maxWidth?: number;
  },
): string {
  if (!isUnsplashUrl(src)) return src;

  try {
    const parsed = new URL(src);
    const maxWidth = options?.maxWidth ?? parseCoverWidth(getImageKitCoverTransformation(), 400);
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("w", String(maxWidth));
    if (!parsed.searchParams.has("q")) {
      parsed.searchParams.set("q", "80");
    }
    return parsed.toString();
  } catch {
    return src;
  }
}

export function toCdnImageUrl(
  src?: string,
  options?: {
    transformation?: string | null;
    scene?: ImageKitScene;
  },
): string | undefined {
  if (!src) return src;
  if (!isImageKitEnabled() || !isMappableLocalImagePath(src)) return src;

  const resolved = resolveLocalUrl(src);
  if (!resolved) return src;

  const matchedRule = getImageKitPathRules().find((rule) =>
    resolved.pathname.startsWith(rule.prefix)
  );
  if (!matchedRule) return src;

  const endpoint = getImageKitUrlEndpoint();

  if (isGifImagePath(src)) {
    return `${endpoint}${resolved.pathname}${resolved.search}${resolved.hash}`;
  }

  const sceneTransformation = options?.scene ? getSceneTransformation(options.scene) : undefined;
  const transformation = options?.transformation === undefined
    ? (sceneTransformation ?? matchedRule.transformation)
    : options.transformation;
  const deliveryBase = transformation
    ? `${endpoint}/tr:${transformation}`
    : endpoint;

  return `${deliveryBase}${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function resolveCoverImageUrl(
  src?: string,
  options?: {
    scene?: Extract<ImageKitScene, "cover" | "featuredCover">;
  },
): string | undefined {
  if (!src) return src;

  const scene = options?.scene ?? "cover";
  const cdnUrl = toCdnImageUrl(src, { scene });
  if (cdnUrl && cdnUrl !== src) return cdnUrl;

  if (ABSOLUTE_URL_RE.test(src)) {
    const maxWidth = parseCoverWidth(
      scene === "featuredCover"
        ? getImageKitFeaturedCoverTransformation()
        : getImageKitCoverTransformation(),
      scene === "featuredCover" ? 800 : 400,
    );
    return optimizeExternalCoverUrl(src, { maxWidth });
  }

  return cdnUrl || src;
}

export function buildResponsiveSrcSet(
  src: string,
  naturalWidth: number,
): { srcset: string; sizes: string } | null {
  if (!isImageKitEnabled() || !isMappableLocalImagePath(src) || isGifImagePath(src)) {
    return null;
  }

  const widths: number[] = BODY_SRCSET_WIDTHS.filter((width) => width <= naturalWidth);
  const cappedWidth = Math.min(naturalWidth, 1280);
  if (widths.length === 0 || widths[widths.length - 1] !== cappedWidth) {
    widths.push(cappedWidth);
  }

  const bodyTransformation = getImageKitBodyTransformation();
  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);
  const entries = uniqueWidths
    .map((width) => {
      const url = toCdnImageUrl(src, {
        transformation: transformationAtWidth(bodyTransformation, width),
      });
      return url ? `${url} ${width}w` : null;
    })
    .filter((entry): entry is string => !!entry);

  if (entries.length < 2) return null;

  return {
    srcset: entries.join(", "),
    sizes: ARTICLE_IMAGE_SIZES,
  };
}

/**
 * 为封面/卡片图片生成 srcset + sizes。
 *
 * 与 buildResponsiveSrcSet（正文图片专用）不同，此函数使用
 * 卡片场景对应的转换参数和更少的宽度档位，在移动端显著节省带宽。
 */
export function buildCoverSrcSet(
  src: string,
  options: {
    scene: Extract<ImageKitScene, "cover" | "featuredCover">;
  },
): { srcset: string; sizes: string } | null {
  if (!isImageKitEnabled() || !isMappableLocalImagePath(src) || isGifImagePath(src)) {
    return null;
  }

  const isFeatured = options.scene === "featuredCover";
  const widths = isFeatured
    ? FEATURED_COVER_SRCSET_WIDTHS
    : CARD_COVER_SRCSET_WIDTHS;
  const sizes = isFeatured ? FEATURED_COVER_SIZES : CARD_COVER_SIZES;
  const baseTransformation = getSceneTransformation(options.scene);

  const entries = widths
    .map((width) => {
      const url = toCdnImageUrl(src, {
        transformation: transformationAtWidth(baseTransformation, width),
      });
      return url ? `${url} ${width}w` : null;
    })
    .filter((entry): entry is string => !!entry);

  if (entries.length < 2) return null;

  return {
    srcset: entries.join(", "),
    sizes,
  };
}

/** <picture> 内单个 <source> 的数据 */
export interface CoverPictureSource {
  media: string;
  srcset: string;
  sizes: string;
}

/** 相关阅读卡片 <picture> 数据 */
export interface CoverPictureData {
  /** 移动端（≤768px）：2:3 竖图裁切 */
  mobile: CoverPictureSource;
  /** 桌面端（≥769px）：16:9 横图裁切 */
  desktop: CoverPictureSource;
  /** <img> fallback src（桌面 16:9） */
  fallback: string;
}

/**
 * 为相关阅读卡片生成 <picture> 数据，按 viewport 裁切不同比例：
 * - 移动端（≤768px）：2:3 竖图，宽度档 200 / 400
 * - 桌面端（≥769px）：16:9 横图，宽度档 400 / 600
 *
 * ImageKit 使用 ar-{w}-{h} + c-maintain_ratio 按指定比例裁切，
 * fo-auto 自动聚焦画面主体，避免裁掉关键内容。
 */
export function buildCoverPictureData(
  src: string,
): CoverPictureData | null {
  if (!isImageKitEnabled() || !isMappableLocalImagePath(src) || isGifImagePath(src)) {
    return null;
  }

  const mobileBase = "f-auto,q-auto,ar-2-3,c-maintain_ratio,fo-auto";
  const desktopBase = "f-auto,q-auto,ar-16-9,c-maintain_ratio,fo-auto";

  const mobileEntries = [...CARD_PICTURE_MOBILE_WIDTHS]
    .map((width) => {
      const url = toCdnImageUrl(src, { transformation: `w-${width},${mobileBase}` });
      return url ? `${url} ${width}w` : null;
    })
    .filter((entry): entry is string => !!entry);

  const desktopEntries = [...CARD_PICTURE_DESKTOP_WIDTHS]
    .map((width) => {
      const url = toCdnImageUrl(src, { transformation: `w-${width},${desktopBase}` });
      return url ? `${url} ${width}w` : null;
    })
    .filter((entry): entry is string => !!entry);

  if (mobileEntries.length < 1 || desktopEntries.length < 1) return null;

  const fallback = toCdnImageUrl(src, { transformation: `w-400,${desktopBase}` }) || src;

  return {
    mobile: {
      media: "(max-width: 768px)",
      srcset: mobileEntries.join(", "),
      sizes: "42vw",
    },
    desktop: {
      media: "(min-width: 769px)",
      srcset: desktopEntries.join(", "),
      sizes: "280px",
    },
    fallback,
  };
}