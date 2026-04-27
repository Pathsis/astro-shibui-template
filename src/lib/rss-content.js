import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();
const alignmentTitles = new Set(["align-left", "align-right", "align-center", "full-bleed"]);

parser.renderer.rules.image = function(tokens, idx) {
  const token = tokens[idx];
  const src = token.attrGet("src") || "";
  const alt = (token.content || token.attrGet("alt") || "").trim();
  const title = token.attrGet("title") || "";
  const escapedSrc = parser.utils.escapeHtml(src);
  const escapedAlt = parser.utils.escapeHtml(alt);
  const titleAttr = title && !alignmentTitles.has(title)
    ? ` title="${parser.utils.escapeHtml(title)}"`
    : "";
  const image = `<img src="${escapedSrc}" alt="${escapedAlt}"${titleAttr}>`;

  if (!alt) return image;

  return `${image}<br><em>${escapedAlt}</em>`;
};

export function stripFootnotesForFeed(markdown) {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  let skippingFootnote = false;

  for (const line of lines) {
    if (/^\[\^[^\]]+\]:/.test(line)) {
      skippingFootnote = true;
      continue;
    }

    if (skippingFootnote) {
      if (line.trim() === "" || /^(?: {4}|\t)/.test(line)) continue;
      skippingFootnote = false;
    }

    output.push(line);
  }

  return output.join("\n").replace(/\[\^[^\]]+\]/g, "");
}

export function renderRssMarkdown(markdown) {
  const htmlContent = parser.render(stripFootnotesForFeed(markdown));

  return sanitizeHtml(htmlContent, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title"],
    },
  });
}
