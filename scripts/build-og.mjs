#!/usr/bin/env node
/**
 * 把 scripts/og-cover.svg 渲染成 public/og-cover.png（1200×630）
 *
 * 用无头 Chromium 渲染而不是 SVG 转换库：中文字体的排版要和浏览器
 * 看到的一致，转换库对 CJK 字体的处理经常掉字或换字体。
 *
 * 用法：npm run og
 *
 * 这一步不进 CI/构建流程 —— 生成好的 PNG 已经提交进仓库，
 * 只有改了 SVG 才需要手动重跑。CI 里没有中文字体，渲出来会是方框。
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SVG = join(ROOT, "scripts", "og-cover.svg");
const OUT_DIR = join(ROOT, "public");
const OUT = join(OUT_DIR, "og-cover.png");

/** 找一个能用的 Chrome / Chromium */
function findBrowser() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ];
  return candidates.find((p) => existsSync(p));
}

const browserPath = findBrowser();
if (!browserPath) {
  console.error(
    "找不到可用的 Chrome / Chromium。\n" +
      "装了 Google Chrome 就能跑；或者用任意工具把 scripts/og-cover.svg\n" +
      "导出成 1200×630 的 public/og-cover.png 也一样。"
  );
  process.exit(1);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const svg = readFileSync(SVG, "utf8");
// 用 data URL 喂进去，省掉起本地服务器
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const { spawnSync } = await import("node:child_process");
const args = [
  "--headless",
  "--disable-gpu",
  "--no-sandbox",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--window-size=1200,630",
  `--screenshot=${OUT}`,
  dataUrl,
];

const res = spawnSync(browserPath, args, { stdio: "pipe", encoding: "utf8" });
if (res.error || !existsSync(OUT)) {
  console.error("渲染失败：", res.error?.message ?? res.stderr?.slice(0, 400));
  process.exit(1);
}

const { statSync } = await import("node:fs");
const pngSize = statSync(OUT).size;

/**
 * 转成 JPEG：这张图整体是平滑渐变，PNG 的无损压缩对渐变几乎没用
 * （375KB），JPEG 能压到十分之一且看不出差别。
 * 各社交平台对 JPEG 的支持比 PNG 更没有争议。
 * macOS 自带 sips，其他平台没有就保留 PNG。
 */
const JPG = OUT.replace(/\.png$/, ".jpg");
let finalFile = OUT;

if (process.platform === "darwin") {
  const conv = spawnSync(
    "sips",
    ["-s", "format", "jpeg", "-s", "formatOptions", "82", OUT, "--out", JPG],
    { stdio: "pipe", encoding: "utf8" }
  );
  if (!conv.error && existsSync(JPG)) {
    const jpgSize = statSync(JPG).size;
    if (jpgSize < pngSize) {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(OUT); // 只留一份，避免 public/ 里两个同名不同格式的图
      finalFile = JPG;
      console.log(
        `✓ public/og-cover.jpg  ${(jpgSize / 1024).toFixed(0)}KB` +
          `（PNG 原本 ${(pngSize / 1024).toFixed(0)}KB）`
      );
    }
  }
}

if (finalFile === OUT) {
  console.log(`✓ public/og-cover.png  ${(pngSize / 1024).toFixed(0)}KB`);
}

console.log(`  用的浏览器：${browserPath}`);
console.log(`  记得确认 content/site.yml 的 share.image 指向的是这个文件名。`);
