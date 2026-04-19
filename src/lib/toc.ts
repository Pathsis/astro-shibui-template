export type TocHeading = {
  depth: number;
  slug: string;
  text: string;
};

export type TocItem = {
  depth: 2 | 3;
  slug: string;
  text: string;
  level: "h2" | "h3";
  tocNumber: string;
  lineWidth: string;
};

const EXCLUDED_TOC_TITLES = new Set([
  "footnotes",
  "footnote",
  "notes",
  "注释",
  "参考文献",
  "参考",
]);

const EXCLUDED_TOC_SLUGS = new Set([
  "footnote-label",
  "user-content-footnote-label",
]);

export function buildArticleToc(headings: TocHeading[]): TocItem[] {
  let h2Index = 0;
  let h3Index = 0;

  return headings
    .filter((heading) => heading.depth === 2 || heading.depth === 3)
    .filter((heading) => {
      const normalized = heading.text.trim().toLowerCase();
      const normalizedSlug = heading.slug.trim().toLowerCase();
      return normalized !== ""
        && !EXCLUDED_TOC_TITLES.has(normalized)
        && !EXCLUDED_TOC_SLUGS.has(normalizedSlug);
    })
    .map((heading) => {
      const depth = heading.depth as 2 | 3;
      let tocNumber = "";

      if (depth === 2) {
        h2Index += 1;
        h3Index = 0;
        tocNumber = `${h2Index}.`;
      } else {
        h3Index += 1;
        tocNumber = `${h2Index}.${h3Index}.`;
      }

      return {
        depth,
        slug: heading.slug,
        text: heading.text,
        level: depth === 2 ? "h2" : "h3",
        tocNumber,
        lineWidth: depth === 2 ? "1.35rem" : "0.9rem",
      };
    });
}
