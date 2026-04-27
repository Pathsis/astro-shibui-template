import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();

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
