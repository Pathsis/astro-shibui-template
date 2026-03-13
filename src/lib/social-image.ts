import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";

const LOCAL_TRANSFORMABLE_RE = /\.(?:avif|gif|jpe?g|png|webp|svg)$/i;

export type SocialImageSource = "images" | "other";

export function createSocialImageVersionToken(seed: string | undefined): string | undefined {
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

function toGeneratedLocalSocialPath(localPathname: string) {
  const normalized = localPathname.startsWith("/") ? localPathname : `/${localPathname}`;
  let hashKey = normalized;
  try {
    hashKey = decodeURIComponent(normalized);
  } catch {
    // Keep encoded pathname when decoding fails.
  }
  const hash = createHash("sha1").update(hashKey).digest("hex").slice(0, 16);
  return `/generated/social/${hash}.jpg`;
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
  const isSameOrigin = resolved.origin === canonicalURL.origin;
  const isLocalTransformable = LOCAL_TRANSFORMABLE_RE.test(resolved.pathname);

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

  if (shouldCrop && isSameOrigin && isLocalTransformable) {
    const generatedPath = toGeneratedLocalSocialPath(resolved.pathname);
    const publicDir = options.publicDir ?? join(process.cwd(), "public");
    const generatedFile = join(publicDir, generatedPath.slice(1));

    if (existsSync(generatedFile)) {
      finalImage = new URL(generatedPath, canonicalURL);
    }
  }

  if (options.versionToken) {
    finalImage.searchParams.set("v", options.versionToken);
  }

  return finalImage.toString();
}
