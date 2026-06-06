import { visit } from "unist-util-visit";
import { isImageKitEnabled, isMappableLocalImagePath, toCdnImageUrl } from "./image-cdn";

type Root = {
  type: "root";
  children: Node[];
};

type ImageNode = {
  type: "image";
  url: string;
};

type DefinitionNode = {
  type: "definition";
  url: string;
};

type HtmlNode = {
  type: "html";
  value: string;
};

type Node = ImageNode | DefinitionNode | HtmlNode | { type: string };

function isImageLikeNode(node: Node): node is ImageNode | DefinitionNode {
  return (node.type === "image" || node.type === "definition") && "url" in node;
}

function isHtmlNode(node: Node): node is HtmlNode {
  return node.type === "html" && "value" in node;
}

function rewriteRawHtml(value: string): string {
  return value.replace(
    /\b(src|srcset)=("|')([^"'<>]+)\2/gi,
    (full, attrName: string, quote: string, rawValue: string) => {
      const rewritten = toCdnImageUrl(rawValue);
      if (!rewritten || rewritten === rawValue) return full;
      return `${attrName}=${quote}${rewritten}${quote}`;
    },
  );
}

function rewriteUrl(url?: string): string | undefined {
  if (!url || !isMappableLocalImagePath(url)) return url;
  return toCdnImageUrl(url) || url;
}

export default function remarkImageCdn() {
  const shouldUseImageKit = isImageKitEnabled();

  return (tree: Root) => {
    if (!shouldUseImageKit) return;

    visit(tree, (node: Node) => {
      if (isImageLikeNode(node)) {
        node.url = rewriteUrl(node.url) || node.url;
        return;
      }

      if (isHtmlNode(node)) {
        node.value = rewriteRawHtml(node.value);
      }
    });
  };
}
