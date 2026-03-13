/**
 * rehype-image-figure 插件
 * 将 <img> 标签包装在 <figure> 中，并添加 <figcaption>
 * 模仿 Hugo 的 render-image.html 行为
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

export default function rehypeImageFigure(options: Options = {}) {
  const { alwaysCaption = false } = options;

  return (tree: Root) => {
    const imagesToProcess: Array<{ img: Element; parent: Parent; index: number }> = [];

    // 首先收集所有需要处理的图片
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'img') return;

      // 跳过已经在 figure 中的图片
      if (parent?.type === 'element' && (parent as Element).tagName === 'figure') {
        return;
      }

      // 跳过已处理的图片
      if (node.data?._imageFigureProcessed) return;

      imagesToProcess.push({ img: node, parent: parent!, index: index! });
    });

    // 然后处理收集到的图片（从后往前处理，避免索引问题）
    for (let i = imagesToProcess.length - 1; i >= 0; i--) {
      const { img, parent, index } = imagesToProcess[i];
      const altText = (img.properties.alt as string) || '';

      // 创建 figure 元素
      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: {},
        children: [img],
      };

      // 如果有 alt 文本，添加 figcaption
      if (altText && (alwaysCaption || altText.trim() !== '')) {
        const figcaption: Element = {
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: altText }],
        };
        figure.children.push(figcaption);
      }

      // 如果图片在 <p> 标签中，且 <p> 只有这一个子元素，替换整个 <p> 为 <figure>
      if (
        parent.type === 'element' &&
        (parent as Element).tagName === 'p' &&
        (parent as Element).children.length === 1
      ) {
        // 需要在树中找到 p 标签的位置并替换
        visit(tree, 'element', (node, _nodeIndex, nodeParent) => {
          if (node === parent && nodeParent) {
            if (nodeParent.type === 'root') {
              const rootIndex = (nodeParent as Root).children.indexOf(node);
              if (rootIndex !== -1) {
                (nodeParent as Root).children[rootIndex] = figure;
                // 更新 figure 的 parent 引用
                figure.parent = nodeParent;
              }
            } else if (nodeParent.type === 'element') {
              const parentIndex = (nodeParent as Element).children.indexOf(node);
              if (parentIndex !== -1) {
                (nodeParent as Element).children[parentIndex] = figure;
                figure.parent = nodeParent;
              }
            }
          }
        });
      } else {
        // 正常情况：直接替换 img 为 figure
        if (parent.type === 'element') {
          (parent as Element).children[index] = figure;
          figure.parent = parent;
        } else if (parent.type === 'root') {
          (parent as Root).children[index] = figure;
          figure.parent = parent;
        }
      }

      // 标记已处理
      img.data = { ...img.data, _imageFigureProcessed: true };
    }
  };
}
