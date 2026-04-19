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
