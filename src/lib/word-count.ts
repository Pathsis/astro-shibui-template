/**
 * 字数统计工具函数
 * 统一处理中文和英文文章的字数计算
 */

/**
 * 计算单个文章内容的字数
 * @param content - Markdown 渲染后的 HTML 内容
 * @param lang - 语言 ("zh-cn" | "en")
 * @returns 字数
 */
export function countWords(content: string, lang: "zh-cn" | "en"): number {
  if (!content) return 0;

  // 移除 Markdown 语法符号，更接近 Hugo 的处理方式
  const cleanContent = content
    .replace(/---[\s\S]*?---/g, '') // 移除 frontmatter
    .replace(/[#*_`\[\](){}|!\-]/g, '') // 移除常见 Markdown 符号
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 将链接 [text](url) 转为 text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // 移除图片标记
    .trim();

  if (lang === "en") {
    // 英文：按单词数统计
    return cleanContent.split(/\s+/).filter(w => w.length > 0).length;
  } else {
    // 中文：统计所有非空白字符
    return cleanContent.replace(/\s/g, "").length;
  }
}

/**
 * 格式化字数显示
 * @param count - 字数
 * @param lang - 语言
 * @returns 格式化后的字符串
 */
export function formatWordCount(count: number, lang: "zh-cn" | "en"): string {
  if (lang === "en") {
    return `${Math.round(count / 1000)}k`;
  } else {
    return `${(count / 10000).toFixed(2)} 万`;
  }
}
