# Astro Hang

一个可直接发布的 Astro 双语博客模板目录。

这个目录本身就是公开边界，可直接作为 Git Subtree 推送到模板仓库。

## 开发

```sh
pnpm install
cp .env.example .env
pnpm dev
```

## 你最需要改的地方

1. `site.config.js`：站点标题、描述、作者名、播客域名、RSS 联系信息
2. `content/`：文章和 About 页面正文
3. `.env`：Algolia、Giscus、Umami、Clarity 等第三方服务
4. `public/`：如果你想替换模板自带 branding，可在这里更换图标和分享图

## Vercel 部署提醒

如果你部署到 Vercel：

- Vercel 不会读取你本机上的 `.env`
- 你必须把需要的环境变量手动配置到 Vercel 项目的 Environment Variables 中

至少应检查：

- `PUBLIC_ALGOLIA_APP_ID`
- `PUBLIC_ALGOLIA_SEARCH_KEY`
- `PUBLIC_ALGOLIA_INDEX_NAME`
- `PUBLIC_GISCUS_REPO`
- `PUBLIC_GISCUS_REPO_ID`
- `PUBLIC_GISCUS_CATEGORY`
- `PUBLIC_GISCUS_CATEGORY_ID`
- `PUBLIC_UMAMI_SCRIPT_SRC`
- `PUBLIC_UMAMI_WEBSITE_ID`
- `PUBLIC_UMAMI_HOSTS`
- `PUBLIC_CLARITY_PROJECT_ID`
- `PUBLIC_CLARITY_HOSTS`

如果这些变量没有配置，线上可能出现以下现象：

- 搜索框显示“搜索尚未配置”
- 评论区不显示
- Umami 或 Clarity 不工作

## 发布

在私有主仓库根目录执行：

```sh
pnpm export:template
git subtree push --prefix template <public-remote> <branch>
```

## 说明

- 模板不包含你的私有文章
- 模板不包含你的文章配图
- 模板不包含你的真实 Discuss、Umami、Clarity、Algolia 配置
- 模板会保留可替换的预览 branding 资源，方便用户开箱预览
