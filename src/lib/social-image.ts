import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolvePublicRoot } from "./public-root";

const LOCAL_TRANSFORMABLE_RE = /\.(?:avif|gif|jpe?g|png|webp|svg)$/i;
const REMOTE_IMAGE_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

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
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.BUILD_TIME ||
    new Date().toISOString()
  );
}

function toGeneratedLocalSocialPath(localPathname: string, variantKey?: string) {
  const hashKey = getSocialImageHashKey(localPathname, variantKey);
  const hash = createHash("sha1").update(hashKey).digest("hex").slice(0, 16);
  return `/generated/social/${hash}.jpg`;
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
  const generatedPath = getGeneratedSocialImagePath(rawImage, {
    variantKey,
  });
  const publicDir = options.publicDir ?? resolvePublicRoot();
  const generatedFile = join(publicDir, generatedPath.slice(1));

  if (shouldCrop && existsSync(generatedFile)) {
    const finalImage = new URL(generatedPath, canonicalURL);
    if (variantToken) {
      finalImage.searchParams.set("pv", variantToken);
    }
    if (options.versionToken) {
      finalImage.searchParams.set("v", options.versionToken);
    }
    return finalImage.toString();
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

  if (variantToken) {
    finalImage.searchParams.set("pv", variantToken);
  }

  if (options.versionToken) {
    finalImage.searchParams.set("v", options.versionToken);
  }

  return finalImage.toString();
}
