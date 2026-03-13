/**
 * Astro Shibui 站点配置
 *
 * 这是模板的核心配置文件，集中管理所有站点相关信息。
 * 请根据您的需求修改这些配置。
 */

export const siteConfig = {
  // ==================== 基本信息 ====================
  // 站点名称
  name: "Your Site Name",

  // 站点描述
  description: "Your site description",

  // 作者名称
  author: "Your Name",

  // 站点 URL（构建时会使用此配置）
  url: "https://yourdomain.com",

  // ==================== 多语言配置 ====================
  locales: {
    // 默认语言
    default: "zh-cn",
    // 可用语言列表
    available: ["zh-cn", "en"],
  },

  // ==================== 功能开关 ====================
  features: {
    // 播客功能配置
    podcast: {
      // 是否启用播客功能（默认禁用）
      enabled: false,
    },

    // 搜索功能配置
    search: {
      // 是否启用搜索功能（默认启用）
      enabled: true,
      // 搜索提供商（目前仅支持 algolia）
      provider: "algolia" as const,
    },

    // 分析工具配置（模板默认禁用所有分析工具）
    analytics: {
      // 是否启用分析工具（隐私优先，默认禁用）
      enabled: false,
    },

    // 评论系统配置
    comments: {
      // 是否启用评论功能（使用 Giscus）
      enabled: false,
      // Giscus 配置（https://giscus.app 获取）
      giscus: {
        // GitHub 仓库（格式：username/repo）
        repo: "",
        // 仓库 ID（以 R_ 开头）
        repoId: "",
        // Discussion 分类
        category: "",
        // 分类 ID（以 DIC_ 开头）
        categoryId: "",
      },
    },
  },

  // ==================== 社交媒体 ====================
  social: {
    // Twitter 用户名（不需要 @）
    twitter: "",

    // GitHub 用户名或仓库地址
    github: "",

    // Email 地址
    email: "",
  },

  // ==================== 外观配置 ====================
  appearance: {
    // 封面图 URL（留空则不显示封面图）
    featuredImage: "",

    // 是否在首页显示封面图
    showFeaturedImageOnHome: false,
  },
} as const;

/**
 * 配置类型定义
 * 用于确保配置的正确性和类型安全
 */
export type SiteConfig = typeof siteConfig;

/**
 * 获取当前语言环境
 * @param lang - 语言代码
 * @returns 是否为支持的语言
 */
export function isValidLocale(lang: string): lang is "zh-cn" | "en" {
  return siteConfig.locales.available.includes(lang as "zh-cn" | "en");
}

/**
 * 获取站点名称
 * @returns 站点名称
 */
export function getSiteName(): string {
  return siteConfig.name;
}

/**
 * 获取站点描述
 * @returns 站点描述
 */
export function getSiteDescription(): string {
  return siteConfig.description;
}

/**
 * 获取作者名称
 * @returns 作者名称
 */
export function getAuthorName(): string {
  return siteConfig.author;
}

/**
 * 检查播客功能是否启用
 * @returns 是否启用播客
 */
export function isPodcastEnabled(): boolean {
  return siteConfig.features.podcast.enabled;
}

/**
 * 检查搜索功能是否启用
 * @returns 是否启用搜索
 */
export function isSearchEnabled(): boolean {
  return siteConfig.features.search.enabled;
}

/**
 * 检查评论功能是否启用
 * @returns 是否启用评论
 */
export function isCommentsEnabled(): boolean {
  return siteConfig.features.comments.enabled;
}
