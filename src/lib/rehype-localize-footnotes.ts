import { visit } from "unist-util-visit";

type Root = {
  type: "root";
  children: Array<ElementNode | TextNode>;
};

type TextNode = {
  type: "text";
  value: string;
};

type ElementNode = {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: Array<ElementNode | TextNode>;
};

function getSourcePath(file: { path?: string; history?: string[] }): string {
  if (typeof file.path === "string" && file.path) return file.path;
  if (Array.isArray(file.history) && file.history.length > 0) return file.history[0] || "";
  return "";
}

function isEnglishSource(path: string): boolean {
  return /[\\/](?:src[\\/])?content[\\/]blog-en[\\/]/i.test(path);
}

function replaceText(node: ElementNode, value: string) {
  node.children = [{ type: "text", value }];
}

export default function rehypeLocalizeFootnotes() {
  return (tree: Root, file: { path?: string; history?: string[] }) => {
    const localizedTitle = isEnglishSource(getSourcePath(file)) ? "Notes" : "注释";

    visit(tree, "element", (node: ElementNode) => {
      if (node.tagName !== "h2") return;
      if (node.properties.id !== "footnote-label") return;

      const anchor = node.children.find(
        (child): child is ElementNode => child.type === "element" && child.tagName === "a",
      );

      if (anchor) {
        replaceText(anchor, localizedTitle);
        return;
      }

      replaceText(node, localizedTitle);
    });
  };
}
