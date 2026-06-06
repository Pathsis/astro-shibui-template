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

export default function rehypeInternalReloadLinks(options: Options = {}) {
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

      if (resolved.origin !== siteUrl.origin) return;
      if (!/^https?:$/.test(resolved.protocol)) return;

      node.properties["data-astro-reload"] = "";
    });
  };
}
