/**
 * 本地图片解析
 *
 * content/images/ 下的图片由 Vite 在构建期处理：加内容哈希、可长期缓存，
 * 换图后 URL 自动变，不会读到旧缓存。
 *
 * YAML 里只写文件名（`zhaoyun.jpg`），这里负责映射到真实 URL。
 * 也接受 `images/zhaoyun.jpg` 和 `./zhaoyun.jpg` 这类写法，
 * 手写内容时不必纠结前缀。
 */

/**
 * eager glob：把 content/images/ 下的图片全部纳入打包。
 * 值是图片模块，`default` 才是可用的 URL：
 *   - 开发时  /content/images/xxx.png
 *   - 生产时  /assets/xxx-<hash>.png，或小图直接内联成 data URI
 *     （Vite 默认 4KB 以下内联，所以 dist/assets 里可能看不到文件，
 *      这不是出错，URL 照样能用）
 *
 * 路径以 / 开头，锚定在项目根：content/ 在 src/ 之外，
 * 用相对路径要写 ../../，跨出 src 后不如根锚定直观。
 */
const imageModules = import.meta.glob<{ default: string }>(
  "/content/images/*.{png,jpg,jpeg,webp,avif,gif,svg}",
  { eager: true }
);

/** 文件名（不含路径）-> 构建后 URL */
const imageMap: Record<string, string> = {};
for (const [path, mod] of Object.entries(imageModules)) {
  const filename = path.split("/").pop();
  const url = mod?.default;
  if (filename && typeof url === "string") imageMap[filename] = url;
}

/** 已登记的本地图片文件名，出错时列给用户看 */
export const localImageNames: string[] = Object.keys(imageMap).sort();

/** 是否是绝对 URL（http/https）或协议相对写法 */
const isRemote = (value: string): boolean => /^(https?:)?\/\//i.test(value);

/** 是否是站点根路径引用（放在 public/ 下的图） */
const isRootPath = (value: string): boolean => value.startsWith("/");

/**
 * 把 YAML 里写的头像值解析成可用的 src。
 *
 * 支持四种写法：
 *   1. `zhaoyun.jpg`              → content/images/ 下的本地图（推荐）
 *   2. `images/zhaoyun.jpg`       → 同上，容忍带目录前缀
 *   3. `https://…/avatar.jpg`     → 在线图片
 *   4. `/avatar.jpg`              → public/ 下的图片，原样发布
 *
 * 找不到对应的本地文件时返回 null，由调用方退回首字头像；
 * 同时在控制台指出可用的文件名，省得逐个猜拼写。
 */
export function resolveImage(value: string, context: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  // 在线图片和 public/ 下的图都直接交给浏览器
  if (isRemote(raw) || isRootPath(raw)) return raw;

  // 剥掉 `./`、`images/`、`content/images/` 之类的前缀，只取文件名
  const filename = raw.replace(/^\.?\/?(content\/)?(images\/)?/, "").split("/").pop();
  if (!filename) return null;

  const url = imageMap[filename];
  if (url) return url;

  console.warn(
    `[content] ${context} 引用的图片 "${raw}" 不在 content/images/ 下。` +
      (localImageNames.length
        ? ` 现有文件：${localImageNames.join("、")}`
        : " 该目录当前没有图片。")
  );
  return null;
}
