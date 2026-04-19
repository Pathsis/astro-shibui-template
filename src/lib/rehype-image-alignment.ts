/**
 * rehype-image-alignment 插件
 */

import { visit } from 'unist-util-visit';

type Root = {
  type: 'root';
  children: Array<Element | TextNode>;
};

type Parent = Root | Element;

type TextNode = {
  type: 'text';
  value: string;
};

type Element = {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: Array<Element | TextNode>;
  data?: Record<string, unknown>;
  parent?: Parent;
};

export default function rehypeImageAlignment() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'figure') return;

      const imgNode = node.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'img'
      );

      if (!imgNode) return;

      const imgTitle = imgNode.properties?.title as string | undefined;
      const alignmentClass =
        imgTitle === 'align-left' ||
        imgTitle === 'align-right' ||
        imgTitle === 'align-center' ||
        imgTitle === 'full-bleed'
          ? imgTitle
          : undefined;

      if (!alignmentClass) return;

      const existingClasses = Array.isArray(node.properties.className)
        ? node.properties.className
        : typeof node.properties.className === 'string'
          ? [node.properties.className]
          : [];

      node.properties.className = [...existingClasses, alignmentClass];

      // Markdown image title 会变成浏览器 tooltip；这里显式删除，避免 "full-bleed" 被显示出来。
      delete imgNode.properties.title;

      if (typeof node.properties.title === 'string' && node.properties.title === alignmentClass) {
        delete node.properties.title;
      }
    });
  };
}
