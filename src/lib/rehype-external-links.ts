import { visit } from "unist-util-visit";

type Root = {
  type: "root";
  children: Array<Element | TextNode>;
};

type TextNode = {
  type: "text";
  value: string;
};

type Element = {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: Array<Element | TextNode>;
};

interface Options {
  site?: string;
}

function toRelTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => String(item).split(/\s+/)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/\s+/).filter(Boolean);
  }
  return [];
}

export default function rehypeExternalLinks(options: Options = {}) {
  const siteUrl = options.site ? new URL(options.site) : undefined;

  return (tree: Root) => {
    if (!siteUrl) return;

    visit(tree, "element", (node) => {
      if (node.tagName !== "a") return;

      const href = typeof node.properties.href === "string" ? node.properties.href.trim() : "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let resolved: URL;
      try {
        resolved = new URL(href, siteUrl.toString());
      } catch {
        return;
      }

      if (siteUrl && resolved.origin === siteUrl.origin) return;
      if (!/^https?:$/.test(resolved.protocol)) return;

      node.properties.target = "_blank";

      const rel = new Set(toRelTokens(node.properties.rel));
      rel.add("noopener");
      rel.add("noreferrer");
      node.properties.rel = Array.from(rel);
    });
  };
}
