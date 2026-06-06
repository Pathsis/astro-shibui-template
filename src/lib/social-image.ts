import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolvePublicRoot } from "./public-root";
import { isImageKitEnabled, isMappableLocalImagePath, toCdnImageUrl } from "./image-cdn";

const LOCAL_TRANSFORMABLE_RE = /\.(?:avif|gif|jpe?g|png|webp|svg)$/i;
const REMOTE_IMAGE_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const IMAGEKIT_SOCIAL_TRANSFORMATION = (
  process.env.PUBLIC_IMAGEKIT_SOCIAL_TRANSFORMATION ||
  "f-auto,q-auto,w-1200,h-630,fo-auto"
).trim();
const IMAGEKIT_SOCIAL_FALLBACK_TRANSFORMATION = (
  process.env.PUBLIC_IMAGEKIT_SOCIAL_FALLBACK_TRANSFORMATION ||
  "f-auto,q-auto"
).trim();
const IMAGEKIT_MEDIA_TRANSFORMATION = (
  process.env.PUBLIC_IMAGEKIT_MEDIA_TRANSFORMATION ||
  "f-auto,q-auto,w-1024,h-1024,fo-auto"
).trim();

export type SocialImageSource = "images" | "other";

export function createSocialImageVersionToken(seed: string | undefined): string | undefined {
  if (!seed) return undefined;
  return createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

function createSocialImageVariantToken(seed: string | undefined): string | undefined {
  if (!seed) return undefined;
  return createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

export function getDefaultSocialImageVersionSeed(): string {
  return (
    process.env.PUBLIC_SOCIAL_IMAGE_VERSION ||
    process.env.PUBLIC_BUILD_VERSION ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.BUILD_TIME ||
    "dev"
  );
}

function toGeneratedLocalSocialPath(localPathname: string, variantKey?: string) {
  const hashKey = getSocialImageHashKey(localPathname, variantKey);
  const hash = createHash("sha1").update(hashKey).digest("hex").slice(0, 16);
  return `/generated/social/${hash}.jpg`;
}

function toGeneratedLocalMediaArtworkPath(localPathname: string, variantKey?: string) {
  const hashKey = getSocialImageHashKey(localPathname, variantKey);
  const hash = createHash("sha1").update(hashKey).digest("hex").slice(0, 16);
  return `/generated/media/${hash}.jpg`;
}

export function isRemoteSocialImage(rawImage: string): boolean {
  return REMOTE_IMAGE_RE.test(rawImage.trim());
}

export function getSocialImageHashKey(rawImage: string, variantKey?: string): string {
  const normalized = rawImage.trim();
  const normalizedVariantKey = variantKey?.trim();
  if (isRemoteSocialImage(normalized)) {
    return normalizedVariantKey ? `${normalized}::${normalizedVariantKey}` : normalized;
  }

  const pathname = normalized.split(/[?#]/)[0] || normalized;
  const prefixed = pathname.startsWith("/") ? pathname : `/${pathname}`;
  try {
    const decoded = decodeURIComponent(prefixed);
    return normalizedVariantKey ? `${decoded}::${normalizedVariantKey}` : decoded;
  } catch {
    return normalizedVariantKey ? `${prefixed}::${normalizedVariantKey}` : prefixed;
  }
}

export function getGeneratedSocialImagePath(
  rawImage: string,
  options?: {
    variantKey?: string;
  },
): string {
  return toGeneratedLocalSocialPath(rawImage, options?.variantKey);
}

export function getGeneratedMediaArtworkPath(
  rawImage: string,
  options?: {
    variantKey?: string;
  },
): string {
  return toGeneratedLocalMediaArtworkPath(rawImage, options?.variantKey);
}

function toGeneratedDeliveryUrl(
  generatedPath: string,
  options: {
    pageUrl: URL;
    variantToken?: string;
    versionToken?: string;
  },
): string {
  const transformed = toCdnImageUrl(generatedPath) || generatedPath;
  return appendImageVersionParams(transformed, options.pageUrl, {
    variantToken: options.variantToken,
    versionToken: options.versionToken,
  });
}

function appendImageVersionParams(
  rawUrl: string,
  pageUrl: URL,
  options: {
    variantToken?: string;
    versionToken?: string;
  },
): string {
  const finalUrl = new URL(rawUrl, pageUrl);
  if (options.variantToken) {
    finalUrl.searchParams.set("pv", options.variantToken);
  }
  if (options.versionToken) {
    finalUrl.searchParams.set("v", options.versionToken);
  }
  return finalUrl.toString();
}

function resolveImageKitSocialUrl(
  rawImage: string,
  options: {
    pageUrl: URL;
    transformation: string;
    variantToken?: string;
    versionToken?: string;
  },
): string | undefined {
  if (!isImageKitEnabled() || !isMappableLocalImagePath(rawImage)) return undefined;

  const transformed = toCdnImageUrl(rawImage, {
    transformation: options.transformation,
  });
  if (!transformed) return undefined;

  return appendImageVersionParams(transformed, options.pageUrl, {
    variantToken: options.variantToken,
    versionToken: options.versionToken,
  });
}

export function resolveSocialImage(
  rawImage: string,
  options: {
    pageUrl: URL;
    versionToken?: string;
    publicDir?: string;
    source?: SocialImageSource;
  },
): string {
  const canonicalURL = options.pageUrl;
  const resolved = new URL(rawImage, canonicalURL);
  const source = options.source ?? "other";
  const shouldCrop = source === "images";
  const isUnsplash = resolved.hostname === "images.unsplash.com";
  const variantKey = shouldCrop ? canonicalURL.pathname : undefined;
  const variantToken = createSocialImageVariantToken(variantKey);
  const imageKitUrl = resolveImageKitSocialUrl(rawImage, {
    pageUrl: canonicalURL,
    transformation: shouldCrop
      ? IMAGEKIT_SOCIAL_TRANSFORMATION
      : IMAGEKIT_SOCIAL_FALLBACK_TRANSFORMATION,
    variantToken,
    versionToken: options.versionToken,
  });
  if (imageKitUrl) {
    return imageKitUrl;
  }

  const generatedPath = getGeneratedSocialImagePath(rawImage, {
    variantKey,
  });
  const publicDir = options.publicDir ?? resolvePublicRoot();
  const generatedFile = join(publicDir, generatedPath.slice(1));

  if (shouldCrop && existsSync(generatedFile)) {
    return appendImageVersionParams(generatedPath, canonicalURL, {
      variantToken,
      versionToken: options.versionToken,
    });
  }

  if (shouldCrop && isUnsplash) {
    const ixid = resolved.searchParams.get("ixid");
    const ixlib = resolved.searchParams.get("ixlib");

    resolved.search = "";
    resolved.searchParams.set("auto", "format");
    resolved.searchParams.set("fit", "crop");
    resolved.searchParams.set("w", "1200");
    resolved.searchParams.set("h", "630");
    resolved.searchParams.set("q", "80");
    resolved.searchParams.set("fm", "jpg");
    if (ixlib) resolved.searchParams.set("ixlib", ixlib);
    if (ixid) resolved.searchParams.set("ixid", ixid);
  }

  let finalImage = resolved;
  const isSameOrigin = resolved.origin === canonicalURL.origin;
  const isLocalTransformable = LOCAL_TRANSFORMABLE_RE.test(resolved.pathname);
  if (shouldCrop && isSameOrigin && isLocalTransformable) {
    finalImage = resolved;
  }

  return appendImageVersionParams(finalImage.toString(), canonicalURL, {
    variantToken,
    versionToken: options.versionToken,
  });
}

export function resolveGeneratedSocialImage(
  rawImage: string,
  options: {
    pageUrl: URL;
    versionToken?: string;
  },
): string {
  const variantKey = options.pageUrl.pathname;
  const variantToken = createSocialImageVariantToken(variantKey);
  const generatedPath = getGeneratedSocialImagePath(rawImage, { variantKey });
  const publicDir = resolvePublicRoot();
  const generatedFile = join(publicDir, generatedPath.slice(1));

  if (!existsSync(generatedFile)) {
    return resolveSocialImage(rawImage, {
      pageUrl: options.pageUrl,
      versionToken: options.versionToken,
      publicDir,
      source: "images",
    });
  }

  return toGeneratedDeliveryUrl(generatedPath, {
    pageUrl: options.pageUrl,
    variantToken,
    versionToken: options.versionToken,
  });
}

export function resolveMediaArtwork(
  rawImage: string,
  options: {
    pageUrl: URL;
    publicDir?: string;
  },
): string {
  const canonicalURL = options.pageUrl;
  const variantKey = canonicalURL.pathname;
  const variantToken = createSocialImageVariantToken(variantKey);
  const imageKitUrl = resolveImageKitSocialUrl(rawImage, {
    pageUrl: canonicalURL,
    transformation: IMAGEKIT_MEDIA_TRANSFORMATION,
    variantToken,
  });
  if (imageKitUrl) {
    return imageKitUrl;
  }

  const generatedPath = getGeneratedMediaArtworkPath(rawImage, { variantKey });
  const publicDir = options.publicDir ?? resolvePublicRoot();
  const generatedFile = join(publicDir, generatedPath.slice(1));

  if (existsSync(generatedFile)) {
    return appendImageVersionParams(generatedPath, canonicalURL, {
      variantToken,
    });
  }

  return resolveSocialImage(rawImage, {
    pageUrl: canonicalURL,
    publicDir,
    source: "images",
  });
}

export function resolveGeneratedMediaArtwork(
  rawImage: string,
  options: {
    pageUrl: URL;
  },
): string {
  const variantKey = options.pageUrl.pathname;
  const variantToken = createSocialImageVariantToken(variantKey);
  const generatedPath = getGeneratedMediaArtworkPath(rawImage, { variantKey });
  const publicDir = resolvePublicRoot();
  const generatedFile = join(publicDir, generatedPath.slice(1));

  if (!existsSync(generatedFile)) {
    return resolveMediaArtwork(rawImage, {
      pageUrl: options.pageUrl,
      publicDir,
    });
  }

  return toGeneratedDeliveryUrl(generatedPath, {
    pageUrl: options.pageUrl,
    variantToken,
  });
}
