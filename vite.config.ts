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
        // 结尾斜杠会让下面拼出 //og-cover.png，先削掉
        const siteUrl = (share.siteUrl || "").replace(/\/+$/, "");
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

export default defineConfig({
  plugins: [react(), yaml(), socialMeta()],
  build: {
    outDir: "dist",
    // Leaflet 在 CommunityMap.tsx 里是动态 import，
    // 打包器会自动拆成独立 chunk，首屏不加载。
  },
});
