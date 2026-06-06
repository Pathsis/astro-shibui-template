/**
 * rehype-image-optimize 插件
 *
 * 在构建时优化文章中的本地图片：
 * 1. 为 <img> 添加 width / height 属性（防止 CLS）
 * 2. 添加 loading="lazy" 和 decoding="async"
 * 3. 启用 ImageKit 时，直接把 /images/... 改写到 CDN，避免继续占用主站同源请求
 *
 * 注意：此插件必须在 rehype-image-alignment 之后运行，
 * 否则后续对 figure 结构的处理可能失效。
 */

import { visit } from "unist-util-visit";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  isLocalRasterImage,
  readImageDimensions,
} from "./image-optimize";
import { isImageKitEnabled, isMappableLocalImagePath, toCdnImageUrl } from "./image-cdn";
import { resolvePublicRoot } from "./public-root";

type Root = {
  type: "root";
  children: Array<Element | TextNode | RawNode>;
};

type TextNode = {
  type: "text";
  value: string;
};

type RawNode = {
  type: "raw";
  value: string;
};

type Element = {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: Array<Element | TextNode | RawNode>;
  data?: Record<string, unknown>;
};

function getSrcSet(node: Element): string | undefined {
  const value = node.properties.srcSet ?? node.properties.srcset;
  return typeof value === "string" ? value : undefined;
}

function setSrcSet(node: Element, value: string) {
  node.properties.srcSet = value;
  node.properties.srcset = value;
}

function rewriteRawHtmlImageSourcesToCdn(node: Root | Element) {
  node.children.forEach((child) => {
    if (child.type === "raw") {
      child.value = child.value.replace(
        /\b(src|srcset)=("|')([^"'<>]+)\2/gi,
        (full, attrName: string, quote: string, rawValue: string) => {
          const rewritten = toCdnImageUrl(rawValue);
          if (!rewritten || rewritten === rawValue) return full;
          return `${attrName}=${quote}${rewritten}${quote}`;
        },
      );
      return;
    }

    if (child.type !== "element") return;

    if (child.tagName === "img") {
      const src = child.properties.src as string | undefined;
      if (isMappableLocalImagePath(src)) {
        child.properties.src = toCdnImageUrl(src) || src;
      }
    }

    if (child.tagName === "source") {
      const srcset = getSrcSet(child);
      if (isMappableLocalImagePath(srcset)) {
        const rewrittenSrcSet = toCdnImageUrl(srcset) || srcset;
        if (rewrittenSrcSet) {
          setSrcSet(child, rewrittenSrcSet);
        }
      }
    }

    rewriteRawHtmlImageSourcesToCdn(child);
  });
}

export default function rehypeImageOptimize() {
  const publicRoot = resolvePublicRoot();
  const shouldUseImageKit = isImageKitEnabled();

  return async (tree: Root) => {
    const tasks: Array<{
      node: Element;
      filePath: string;
    }> = [];

    visit(tree, "element", (node) => {
      if (node.tagName !== "img") return;

      const src = node.properties.src as string | undefined;
      if (!src || !isLocalRasterImage(src)) return;

      const normalizedSrc = src.startsWith("/") ? src : `/${src}`;
      const cleanSrc = normalizedSrc.split(/[?#]/)[0] || normalizedSrc;
      const filePath = join(publicRoot, cleanSrc.slice(1));

      if (!existsSync(filePath)) return;

      tasks.push({ node, filePath });
    });

    if (tasks.length > 0) {
      await Promise.all(
        tasks.map(async ({ node, filePath }) => {
          const originalSrc = node.properties.src as string | undefined;
          const dims = await readImageDimensions(filePath);
          if (dims) {
            node.properties.width = dims.width;
            node.properties.height = dims.height;
          }

          if (!node.properties.loading) {
            node.properties.loading = "lazy";
          }
          if (!node.properties.decoding) {
            node.properties.decoding = "async";
          }

          if (shouldUseImageKit && originalSrc) {
            node.properties.src = toCdnImageUrl(originalSrc) || originalSrc;
          }
        }),
      );
    }

    if (shouldUseImageKit) {
      rewriteRawHtmlImageSourcesToCdn(tree);
    }

    visit(tree, "element", (node) => {
      if (node.tagName !== "img") return;
      if (!node.properties.loading) {
        node.properties.loading = "lazy";
      }
      if (!node.properties.decoding) {
        node.properties.decoding = "async";
      }
    });
  };
}
