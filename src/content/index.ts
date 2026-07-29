/**
 * 内容加载层
 *
 * content/ 下的 YAML 由 @modyfi/vite-plugin-yaml 在构建期转成 JS 对象，
 * 所以运行时没有任何请求开销，改 YAML 会触发热更新。
 *
 * 这里做四件事：
 *   1. 收集所有成员 YAML（新增文件不需要改代码，glob 自动带上）
 *   2. 把手写 YAML 归一化成严格类型，缺字段补默认值
 *   3. 校验角色引用，把写错的 key 打到控制台而不是静默失败
 *   4. 把头像文件名解析成构建后的图片 URL
 */
import type { LinkItem, Member, Role, SiteConfig } from "./types";
import { resolveImage } from "./images";
import rawSite from "../../content/site.yml";
import rawRoles from "../../content/roles.yml";

/**
 * eager glob：content/members/ 下所有 YAML 一次性纳入打包。
 * 想加一批新成员，直接丢个新 .yml 进去就行。
 */
const memberModules = import.meta.glob<{ default: unknown }>("../../content/members/*.yml", {
  eager: true,
});

/* ---------- 取值小工具：YAML 手写容错 ---------- */

const asString = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : fallback;

const asNumber = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => asString(x)).filter(Boolean) : [];

/** 坐标必须是 [纬度, 经度] 两个有限数字，否则视为没有坐标 */
const asLocation = (v: unknown): [number, number] | null => {
  if (!Array.isArray(v) || v.length < 2) return null;
  const [lat, lng] = v;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
};

const asLinks = (v: unknown): LinkItem[] =>
  Array.isArray(v)
    ? v
        .map((item) => {
          const o = (item ?? {}) as Record<string, unknown>;
          return { label: asString(o.label), url: asString(o.url) };
        })
        .filter((l) => l.label && l.url)
    : [];

/* ---------- 站点配置 ---------- */

function normalizeSite(raw: Record<string, unknown>): SiteConfig {
  const map = (raw.map ?? {}) as Record<string, unknown>;
  const sections = (raw.sections ?? {}) as Record<string, unknown>;
  const footer = (raw.footer ?? {}) as Record<string, unknown>;

  return {
    title: asString(raw.title, "UG 名人榜"),
    subtitle: asString(raw.subtitle),
    kicker: asString(raw.kicker, "HALL OF FAME"),
    tagline: asString(raw.tagline),
    map: {
      center: asLocation(map.center) ?? [30, 110],
      zoom: asNumber(map.zoom, 4),
      autoFit: map.autoFit !== false,
      autoFitMaxZoom: asNumber(map.autoFitMaxZoom, 6),
    },
    sections: {
      map: asString(sections.map, "社区版图"),
      mapHint: asString(sections.mapHint),
      roster: asString(sections.roster, "社区名人"),
      rosterHint: asString(sections.rosterHint),
    },
    footer: {
      text: asString(footer.text),
      links: asLinks(footer.links),
    },
  };
}

export const site: SiteConfig = normalizeSite(rawSite as Record<string, unknown>);

/* ---------- 角色 ---------- */

function normalizeRoles(raw: unknown): Role[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      const o = (item ?? {}) as Record<string, unknown>;
      const key = asString(o.key);
      return {
        key,
        label: asString(o.label, key),
        short: asString(o.short, key),
        color: asString(o.color, "#8b949e"),
        description: asString(o.description),
        order: asNumber(o.order, i + 100),
      };
    })
    .filter((r) => r.key)
    .sort((a, b) => a.order - b.order);
}

export const roles: Role[] = normalizeRoles(rawRoles);

/** key -> Role 查表，渲染时高频使用 */
export const roleMap: Record<string, Role> = Object.fromEntries(
  roles.map((r) => [r.key, r])
);

/** 未知角色 key 的兜底，保证渲染不崩 */
const FALLBACK_ROLE: Role = {
  key: "UNKNOWN",
  label: "未定义角色",
  short: "?",
  color: "#8b949e",
  description: "该角色未在 content/roles.yml 中定义。",
  order: 999,
};

export const getRole = (key: string): Role => roleMap[key] ?? FALLBACK_ROLE;

/* ---------- 成员 ---------- */

function normalizeMember(raw: unknown, fallbackId: string): Member {
  const o = (raw ?? {}) as Record<string, unknown>;
  const name = asString(o.name, "未命名");
  const nickname = asString(o.nickname);
  const city = asString(o.city);
  const title = asString(o.title);
  const skills = asStringArray(o.skills);
  const avatarRaw = asString(o.avatar);

  // roles 允许写成字符串（单身份）或数组（多身份）
  const roleList = Array.isArray(o.roles)
    ? asStringArray(o.roles)
    : asStringArray([o.roles]);

  return {
    id: asString(o.id, fallbackId),
    name,
    nickname,
    roles: roleList.length ? roleList : [FALLBACK_ROLE.key],
    title,
    city,
    location: asLocation(o.location),
    // 头像一次性解析：本地文件名换成带哈希的 URL，在线链接原样保留，
    // 找不到就是 null，由组件退回首字色块
    avatar: avatarRaw ? resolveImage(avatarRaw, `成员 ${name} 的头像`) : null,
    skills,
    bio: asString(o.bio),
    homepage: asString(o.homepage),
    links: asLinks(o.links),
    // 预拼搜索串：姓名 / 昵称 / 城市 / 头衔 / 技能都可被搜到
    searchText: [name, nickname, city, title, skills.join(" ")]
      .join(" ")
      .toLowerCase(),
  };
}

function loadMembers(): Member[] {
  const list: Member[] = [];

  // 按文件路径排序，保证不同机器上打包顺序一致
  for (const path of Object.keys(memberModules).sort()) {
    const mod = memberModules[path]?.default;
    if (!Array.isArray(mod)) {
      console.warn(`[content] ${path} 顶层不是数组，已跳过`);
      continue;
    }
    mod.forEach((raw, i) => list.push(normalizeMember(raw, `${path}-${i}`)));
  }

  // id 撞车会让锚点定位和地图联动出错，开发时提示出来
  const seen = new Set<string>();
  for (const m of list) {
    if (seen.has(m.id)) console.warn(`[content] 成员 id 重复：${m.id}`);
    seen.add(m.id);
  }

  // 角色 key 写错时静默变灰很难查，直接报出来
  for (const m of list) {
    for (const key of m.roles) {
      if (!roleMap[key]) {
        console.warn(`[content] 成员 ${m.name} 引用了未定义的角色 "${key}"`);
      }
    }
  }

  return list;
}

export const members: Member[] = loadMembers();

/** 主身份：决定卡片配色与地图标记颜色 */
export const primaryRole = (member: Member): Role => getRole(member.roles[0]);

export type { LinkItem, Member, Role, SiteConfig } from "./types";
