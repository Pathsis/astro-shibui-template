import type { SiteLang } from "./posts";

export interface CategoryGroup {
  canonicalLabel: string;
  count: number;
  matchValues: string[];
}

const EN_CATEGORY_ALIAS_GROUPS = [
  ["Academic Topics", "Academic", "Academic Topics"],
  ["Non-Academic Topics", "Non-Academic", "Non-academic Topics", "Non-Academic Topics"],
] as const;

function normalizeCategoryLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCategoryKey(value: string): string {
  return normalizeCategoryLabel(value).toLowerCase();
}

function getCategoryAliasGroups(lang: SiteLang) {
  return lang === "en" ? EN_CATEGORY_ALIAS_GROUPS : [];
}

export function getCanonicalCategoryLabel(category: string, lang: SiteLang): string {
  const normalized = normalizeCategoryLabel(category);
  if (!normalized) return "";

  const key = normalizeCategoryKey(normalized);
  for (const [canonicalLabel, ...aliases] of getCategoryAliasGroups(lang)) {
    const allLabels = [canonicalLabel, ...aliases];
    if (allLabels.some((label) => normalizeCategoryKey(label) === key)) {
      return canonicalLabel;
    }
  }

  return normalized;
}

export function getCategoryCorePath(category: string): string {
  return `/categories/${normalizeCategoryLabel(category)}/`;
}

export function buildCategoryGroups(
  categoryLists: Array<readonly string[] | null | undefined>,
  lang: SiteLang,
): CategoryGroup[] {
  const groups = new Map<
    string,
    {
      canonicalLabel: string;
      count: number;
      matchValues: Set<string>;
    }
  >();

  for (const categories of categoryLists) {
    if (!categories?.length) continue;

    const canonicalLabelsInPost = new Set<string>();
    for (const rawCategory of categories) {
      const normalizedRaw = normalizeCategoryLabel(rawCategory);
      if (!normalizedRaw) continue;

      const canonicalLabel = getCanonicalCategoryLabel(normalizedRaw, lang);
      canonicalLabelsInPost.add(canonicalLabel);

      let group = groups.get(canonicalLabel);
      if (!group) {
        group = {
          canonicalLabel,
          count: 0,
          matchValues: new Set([canonicalLabel]),
        };
        groups.set(canonicalLabel, group);
      }

      group.matchValues.add(normalizedRaw);
    }

    canonicalLabelsInPost.forEach((canonicalLabel) => {
      const group = groups.get(canonicalLabel);
      if (group) group.count += 1;
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      canonicalLabel: group.canonicalLabel,
      count: group.count,
      matchValues: Array.from(group.matchValues),
    }))
    .sort((a, b) =>
      a.canonicalLabel.localeCompare(b.canonicalLabel, lang === "en" ? "en" : "zh-Hans-CN"),
    );
}
