/**
 * rehype-image-figure 插件
 * 将 <img> 标签包装在 <figure> 中，并添加 <figcaption>
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

interface Options {
  // 是否总是添加 figcaption，即使 alt 文本为空
  alwaysCaption?: boolean;
}

function isImageElement(node: Element | TextNode): node is Element {
  return node.type === 'element' && node.tagName === 'img';
}

function createFigure(img: Element, alwaysCaption: boolean): Element {
  const altText = (img.properties.alt as string) || '';
  const figure: Element = {
    type: 'element',
    tagName: 'figure',
    properties: {},
    children: [img],
  };

  if (altText && (alwaysCaption || altText.trim() !== '')) {
    const figcaption: Element = {
      type: 'element',
      tagName: 'figcaption',
      properties: {},
      children: [{ type: 'text', value: altText }],
    };
    figure.children.push(figcaption);
  }

  img.data = { ...img.data, _imageFigureProcessed: true };
  return figure;
}

function hasMeaningfulParagraphContent(children: Array<Element | TextNode>): boolean {
  return children.some((child) => child.type !== 'text' || child.value.trim() !== '');
}

function cloneParagraph(paragraph: Element, children: Array<Element | TextNode>): Element {
  return {
    type: 'element',
    tagName: 'p',
    properties: { ...paragraph.properties },
    children,
    data: paragraph.data ? { ...paragraph.data } : undefined,
  };
}

function splitParagraphAroundImages(paragraph: Element, alwaysCaption: boolean): Element[] {
  const nodes: Element[] = [];
  let inlineBuffer: Array<Element | TextNode> = [];

  const flushParagraph = () => {
    if (!hasMeaningfulParagraphContent(inlineBuffer)) {
      inlineBuffer = [];
      return;
    }

    nodes.push(cloneParagraph(paragraph, inlineBuffer));
    inlineBuffer = [];
  };

  for (const child of paragraph.children) {
    if (isImageElement(child)) {
      flushParagraph();
      nodes.push(createFigure(child, alwaysCaption));
      continue;
    }

    inlineBuffer.push(child);
  }

  flushParagraph();
  return nodes;
}

export default function rehypeImageFigure(options: Options = {}) {
  const { alwaysCaption = false } = options;

  return (tree: Root) => {
    const paragraphsToProcess: Array<{ paragraph: Element; parent: Parent; index: number }> = [];

    // 先整体处理混合段落，避免生成 <p><figure /></p> 这类无效结构
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || index == null || !parent) return;
      if (!node.children.some(isImageElement)) return;

      paragraphsToProcess.push({ paragraph: node, parent, index });
    });

    for (let i = paragraphsToProcess.length - 1; i >= 0; i--) {
      const { paragraph, parent, index } = paragraphsToProcess[i];
      const replacementNodes = splitParagraphAroundImages(paragraph, alwaysCaption);

      replacementNodes.forEach((node) => {
        node.parent = parent;
      });

      if (parent.type === 'root') {
        (parent as Root).children.splice(index, 1, ...replacementNodes);
      } else {
        (parent as Element).children.splice(index, 1, ...replacementNodes);
      }
    }

    // 再包裹剩余的独立图片（例如位于 div/li 下的块级图片）
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'img' || index == null || !parent) return;
      if (parent.type === 'element' && parent.tagName === 'figure') return;
      if (node.data?._imageFigureProcessed) return;

      const figure = createFigure(node, alwaysCaption);
      figure.parent = parent;

      if (parent.type === 'root') {
        (parent as Root).children[index] = figure;
      } else {
        (parent as Element).children[index] = figure;
      }
    });
  };
}
