import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@modyfi/vite-plugin-yaml";
import { load } from "js-yaml";

/**
 * 把 content/site.yml 里的分享信息写成 <meta> 标签注入 index.html。
 *
 * 必须在构建期做：微信、Slack、Twitter 的爬虫不执行 JS，
 * 运行时用 React 往 head 里塞标签它们看不到。
 */
function socialMeta(): Plugin {
  const esc = (s: string) =>
    String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!
    );

  return {
    name: "social-meta",
    // 开发和构建都注入，这样本地也能用 localhost 地址验证标签是否正确
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const site = load(readFileSync("content/site.yml", "utf8")) as Record<string, any>;
        const share = (site?.share ?? {}) as Record<string, string>;

        const title = share.title || site?.title || "UG 名人榜";
        const description = share.description || site?.subtitle || "";
        // SITE_URL 可以覆盖 YAML 里的地址：同一份内容发到两个域名时，
        // 分享卡片得指向当前这个（GitHub Pages 的地址还多一段仓库名前缀）。
        // 结尾斜杠会让下面拼出 //og-cover.png，先削掉
        const siteUrl = (process.env.SITE_URL || share.siteUrl || "").replace(/\/+$/, "");
        const image = share.image || "";
        // 各平台都要求绝对地址，相对路径会被忽略
        const imageUrl = image && siteUrl ? `${siteUrl}${image}` : "";
        const imageAlt = share.imageAlt || title;

        const tags = [
          `<meta property="og:type" content="website" />`,
          `<meta property="og:title" content="${esc(title)}" />`,
          description && `<meta property="og:description" content="${esc(description)}" />`,
          site?.title && `<meta property="og:site_name" content="${esc(site.title)}" />`,
          `<meta property="og:locale" content="zh_CN" />`,
          siteUrl && `<meta property="og:url" content="${esc(siteUrl)}" />`,
          imageUrl && `<meta property="og:image" content="${esc(imageUrl)}" />`,
          imageUrl && `<meta property="og:image:width" content="1200" />`,
          imageUrl && `<meta property="og:image:height" content="630" />`,
          imageUrl && `<meta property="og:image:alt" content="${esc(imageAlt)}" />`,
          // Twitter 用自己那套；有大图就用大图卡片
          `<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />`,
          `<meta name="twitter:title" content="${esc(title)}" />`,
          description && `<meta name="twitter:description" content="${esc(description)}" />`,
          imageUrl && `<meta name="twitter:image" content="${esc(imageUrl)}" />`,
          // description 同时给搜索引擎用，和 og 保持一致
          description && `<meta name="description" content="${esc(description)}" />`,
        ]
          .filter(Boolean)
          .join("\n    ");

        // index.html 里留了占位注释，替换掉它
        return html.replace("<!--social-meta-->", tags);
      },
    },
  };
}

// 资源前缀。GitHub Pages 的项目站点挂在 /<仓库名>/ 下，打包出来的
// /assets/... 在那儿是 404，页面直接白屏，所以部署时要传 BASE_PATH。
// Cloudflare Pages 挂在根路径，不传就还是 "/"，两边共用这一份配置。
//
// 结尾斜杠补在这里而不是让调用方保证：Vite 拿 base 直接和资源名相拼，
// 传 "/ug-hall-of-fame" 会拼出 /ug-hall-of-fameassets/... 这种鬼东西。
const rawBase = process.env.BASE_PATH || "/";
const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

export default defineConfig({
  plugins: [react(), yaml(), socialMeta()],
  base,
  build: {
    outDir: "dist",
  },
});
