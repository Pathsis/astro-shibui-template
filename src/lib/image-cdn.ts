const IMAGEKIT_URL_ENDPOINT = (process.env.PUBLIC_IMAGEKIT_URL_ENDPOINT || "").trim().replace(/\/+$/, "");
const IMAGEKIT_TRANSFORMATION = (process.env.PUBLIC_IMAGEKIT_TRANSFORMATION || "f-auto,q-auto").trim();
const IMAGEKIT_GENERATED_TRANSFORMATION = (
  process.env.PUBLIC_IMAGEKIT_GENERATED_TRANSFORMATION ||
  IMAGEKIT_TRANSFORMATION
).trim();
const IMAGE_CDN_ENABLED = (process.env.PUBLIC_ENABLE_IMAGE_CDN || "").trim().toLowerCase();

const ABSOLUTE_URL_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const LOCAL_BASE_URL = "https://pathos.local";

const IMAGEKIT_PATH_RULES = [
  {
    prefix: "/images/",
    transformation: IMAGEKIT_TRANSFORMATION,
  },
  {
    prefix: "/generated/social/",
    transformation: IMAGEKIT_GENERATED_TRANSFORMATION,
  },
  {
    prefix: "/generated/media/",
    transformation: IMAGEKIT_GENERATED_TRANSFORMATION,
  },
] as const;

function resolveLocalUrl(src: string): URL | null {
  try {
    return new URL(src, LOCAL_BASE_URL);
  } catch {
    return null;
  }
}

export function isImageKitEnabled(): boolean {
  if (IMAGE_CDN_ENABLED === "false") return false;
  return !!IMAGEKIT_URL_ENDPOINT;
}

export function isMappableLocalImagePath(src?: string): boolean {
  if (!src) return false;
  if (ABSOLUTE_URL_RE.test(src)) return false;
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;

  const resolved = resolveLocalUrl(src);
  if (!resolved) return false;
  return IMAGEKIT_PATH_RULES.some((rule) => resolved.pathname.startsWith(rule.prefix));
}

export function toCdnImageUrl(
  src?: string,
  options?: {
    transformation?: string | null;
  },
): string | undefined {
  if (!src) return src;
  if (!isImageKitEnabled() || !isMappableLocalImagePath(src)) return src;

  const resolved = resolveLocalUrl(src);
  if (!resolved) return src;

  const matchedRule = IMAGEKIT_PATH_RULES.find((rule) =>
    resolved.pathname.startsWith(rule.prefix)
  );
  if (!matchedRule) return src;

  const transformation = options?.transformation === undefined
    ? matchedRule.transformation
    : options.transformation;
  const deliveryBase = transformation
    ? `${IMAGEKIT_URL_ENDPOINT}/tr:${transformation}`
    : IMAGEKIT_URL_ENDPOINT;

  return `${deliveryBase}${resolved.pathname}${resolved.search}${resolved.hash}`;
}
