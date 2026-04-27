import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();
const alignmentTitles = new Set(["align-left", "align-right", "align-center", "full-bleed"]);
const footnoteRefPrefix = "RSSFOOTNOTEREF";
const footnoteRefSuffix = "END";

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
  const captionAttr = alt ? ` data-rss-caption="${escapedAlt}"` : "";

  return `<img src="${escapedSrc}" alt="${escapedAlt}"${titleAttr}${captionAttr}>`;
};

function renderFeedFigures(html) {
  return html.replace(
    /<p>\s*(<img\b(?=[^>]*\bdata-rss-caption="([^"]+)")[^>]*>)\s*<\/p>/g,
    (_match, image, caption) => {
      const cleanImage = image.replace(/\sdata-rss-caption="[^"]+"/, "");
      return `<figure>${cleanImage}<figcaption>${caption}</figcaption></figure>`;
    },
  );
}

function trimBlankEdges(lines) {
  const output = [...lines];
  while (output.length > 0 && output[0].trim() === "") output.shift();
  while (output.length > 0 && output[output.length - 1].trim() === "") output.pop();
  return output;
}

export function extractFootnotesForFeed(markdown) {
  const lines = markdown.split(/\r?\n/);
  const bodyLines = [];
  const footnotes = [];
  let currentFootnote = null;

  for (const line of lines) {
    const footnoteMatch = line.match(/^\[\^([^\]]+)\]:\s?(.*)$/);

    if (footnoteMatch) {
      currentFootnote = {
        label: footnoteMatch[1],
        lines: [footnoteMatch[2] || ""],
      };
      footnotes.push(currentFootnote);
      continue;
    }

    if (currentFootnote) {
      if (line.trim() === "") {
        currentFootnote.lines.push("");
        continue;
      }

      if (/^(?: {4}|\t)/.test(line)) {
        currentFootnote.lines.push(line.replace(/^(?: {4}|\t)/, ""));
        continue;
      }

      currentFootnote = null;
    }

    bodyLines.push(line);
  }

  return {
    body: bodyLines.join("\n"),
    footnotes: footnotes.map((footnote) => ({
      label: footnote.label,
      markdown: trimBlankEdges(footnote.lines).join("\n"),
    })),
  };
}

function prepareFeedFootnotes(markdown) {
  const { body, footnotes } = extractFootnotesForFeed(markdown);
  if (footnotes.length === 0) return { body, orderedFootnotes: [] };

  const footnotesByLabel = new Map(footnotes.map((footnote) => [footnote.label, footnote]));
  const orderedFootnotes = [];
  const numbersByLabel = new Map();
  const bodyWithRefs = body.replace(/\[\^([^\]]+)\]/g, (match, label) => {
    if (!footnotesByLabel.has(label)) return match;

    if (!numbersByLabel.has(label)) {
      numbersByLabel.set(label, orderedFootnotes.length + 1);
      orderedFootnotes.push(footnotesByLabel.get(label));
    }

    const number = numbersByLabel.get(label);
    return `${footnoteRefPrefix}${number}${footnoteRefSuffix}`;
  });

  for (const footnote of footnotes) {
    if (!numbersByLabel.has(footnote.label)) {
      numbersByLabel.set(footnote.label, orderedFootnotes.length + 1);
      orderedFootnotes.push(footnote);
    }
  }

  return { body: bodyWithRefs, orderedFootnotes };
}

function createFootnoteIdPrefix(value) {
  const normalized = String(value || "rss")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "rss";
}

function renderFootnoteRefs(html, idPrefix) {
  return html.replace(
    new RegExp(`${footnoteRefPrefix}(\\d+)${footnoteRefSuffix}`, "g"),
    (_match, number) => {
      const refId = `${idPrefix}-fnref-${number}`;
      const noteId = `${idPrefix}-fn-${number}`;
      return `<sup id="${refId}" role="doc-noteref"><a href="#${noteId}" rel="footnote">${number}</a></sup>`;
    },
  );
}

function renderFootnoteList(footnotes, notesTitle, idPrefix) {
  if (footnotes.length === 0) return "";

  const items = footnotes
    .map((footnote, index) => {
      const number = index + 1;
      const refId = `${idPrefix}-fnref-${number}`;
      const noteId = `${idPrefix}-fn-${number}`;
      const html = renderFeedFigures(parser.render(footnote.markdown));
      const backlink = ` <a href="#${refId}" class="reversefootnote" role="doc-backlink">&#8617;</a>`;
      const content = html.match(/<\/p>\s*$/)
        ? html.replace(/<\/p>\s*$/, `${backlink}</p>`)
        : `${html}${backlink}`;
      return `<li id="${noteId}" role="doc-endnote">${content}</li>`;
    })
    .join("");

  return `<div class="footnotes" role="doc-endnotes"><p><strong>${parser.utils.escapeHtml(notesTitle)}</strong></p><ol>${items}</ol></div>`;
}

export function renderRssMarkdown(markdown, options = {}) {
  const { notesTitle = "Notes", footnoteIdPrefix } = options;
  const idPrefix = createFootnoteIdPrefix(footnoteIdPrefix);
  const { body, orderedFootnotes } = prepareFeedFootnotes(markdown);
  const htmlContent = [
    renderFootnoteRefs(renderFeedFigures(parser.render(body)), idPrefix),
    renderFootnoteList(orderedFootnotes, notesTitle, idPrefix),
  ].join("");

  return sanitizeHtml(htmlContent, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel", "class", "role"],
      div: ["class", "role"],
      img: ["src", "alt", "title"],
      li: ["id", "role"],
      sup: ["id", "role"],
    },
  });
}
