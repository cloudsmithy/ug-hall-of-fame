#!/usr/bin/env node
/**
 * 校验 content/ 下的 YAML
 *
 * 给 PR 用：贡献者改完 YAML 提上来，CI 跑这个脚本，
 * 写错的地方直接标在报告里，不用等部署后才发现。
 *
 * 本地也能跑：npm run validate
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const MEMBERS_DIR = join(CONTENT, "members");
const IMAGES_DIR = join(CONTENT, "images");

const errors = [];
const warnings = [];

const err = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

/** 读一个 YAML，解析失败算错误而不是崩掉 */
function readYaml(path, label) {
  try {
    return load(readFileSync(path, "utf8"));
  } catch (e) {
    err(label, `YAML 语法错误：${e.message.split("\n")[0]}`);
    return null;
  }
}

/* ---------- roles.yml ---------- */
const rolesRaw = readYaml(join(CONTENT, "roles.yml"), "content/roles.yml");
const roleKeys = new Set();

if (rolesRaw !== null) {
  if (!Array.isArray(rolesRaw)) {
    err("content/roles.yml", "顶层应该是一个列表（每项一个角色）");
  } else {
    rolesRaw.forEach((role, i) => {
      const at = `content/roles.yml 第 ${i + 1} 项`;
      if (!role || typeof role !== "object") {
        err(at, "不是一个有效的角色定义");
        return;
      }
      if (!role.key) err(at, "缺少 key 字段");
      else if (roleKeys.has(role.key)) err(at, `角色 key 重复：${role.key}`);
      else roleKeys.add(role.key);

      if (!role.label) warn(at, `角色 ${role.key ?? "?"} 缺少 label，会退化成显示 key`);
      if (!role.short) warn(at, `角色 ${role.key ?? "?"} 缺少 short，徽章上会显示 key`);
      // 颜色要能被 CSS 认出来，否则徽章会变透明
      if (role.color && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(role.color).trim())) {
        err(at, `color 必须是 #RGB 或 #RRGGBB 格式，当前是「${role.color}」`);
      }
    });
  }
}

/* ---------- site.yml ---------- */
const site = readYaml(join(CONTENT, "site.yml"), "content/site.yml");
if (site && typeof site === "object") {
  if (!site.title) warn("content/site.yml", "缺少 title，会用默认标题");
  const center = site.map?.center;
  if (center !== undefined) {
    if (!Array.isArray(center) || center.length < 2 || center.some((n) => typeof n !== "number")) {
      err("content/site.yml", "map.center 必须是两个数字：[纬度, 经度]");
    }
  }

  /* 分享卡片（Open Graph）*/
  const share = site.share;
  if (share && typeof share === "object") {
    const at = "content/site.yml → share";

    if (share.siteUrl) {
      if (!/^https?:\/\//i.test(String(share.siteUrl))) {
        err(at, `siteUrl「${share.siteUrl}」必须以 https:// 开头`);
      } else if (String(share.siteUrl).endsWith("/")) {
        warn(at, "siteUrl 结尾不要加斜杠，否则图片地址会拼出双斜杠");
      }
    } else {
      warn(
        at,
        "没填 siteUrl，分享到微信 / Twitter 时不会显示配图（这些平台不认相对路径）"
      );
    }

    // 图片路径写错是最容易漏的：本地看不出来，发出去才发现没图
    if (share.image) {
      const p = String(share.image);
      if (!p.startsWith("/")) {
        err(at, `image「${p}」应该以 / 开头（相对 public/ 目录，如 /og-cover.jpg）`);
      } else if (!existsSync(join(ROOT, "public", p.replace(/^\//, "")))) {
        const pub = existsSync(join(ROOT, "public")) ? readdirSync(join(ROOT, "public")) : [];
        err(
          at,
          `image「${p}」在 public/ 下找不到。` +
            (pub.length ? ` 现有文件：${pub.join("、")}` : " public/ 是空的。") +
            " 分享图可以用 npm run og 生成。"
        );
      }
    }
  }
}

/* ---------- 本地图片清单 ---------- */
const localImages = new Set(
  existsSync(IMAGES_DIR)
    ? readdirSync(IMAGES_DIR).filter((f) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f))
    : []
);

/* ---------- members/*.yml ---------- */
if (!existsSync(MEMBERS_DIR)) {
  err("content/members/", "目录不存在");
}

const memberFiles = existsSync(MEMBERS_DIR)
  ? readdirSync(MEMBERS_DIR).filter((f) => /\.ya?ml$/i.test(f)).sort()
  : [];

if (memberFiles.length === 0) err("content/members/", "里面没有任何 .yml 文件");

const seenIds = new Map(); // id -> 出现的位置，用于报重复

let memberCount = 0;

for (const file of memberFiles) {
  const label = `content/members/${file}`;
  const list = readYaml(join(MEMBERS_DIR, file), label);
  if (list === null) continue;

  if (!Array.isArray(list)) {
    err(label, "顶层应该是一个列表（每项一个成员，以 `- id: xxx` 开头）");
    continue;
  }

  list.forEach((m, i) => {
    // 报错时优先用姓名指位置，比「第 7 项」好找
    const at = `${label} → ${m?.name ? `「${m.name}」` : `第 ${i + 1} 项`}`;
    if (!m || typeof m !== "object") {
      err(at, "不是一个有效的成员条目");
      return;
    }
    memberCount++;

    /* 必填 */
    if (!m.id) {
      err(at, "缺少 id（唯一标识，建议英文小写连字符，如 zhang-san）");
    } else {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(String(m.id))) {
        warn(at, `id「${m.id}」建议只用小写英文、数字和连字符，中文 id 在分享链接里会变成一长串转义字符`);
      }
      const prev = seenIds.get(m.id);
      if (prev) err(at, `id「${m.id}」和 ${prev} 重复了，分享链接会指错人`);
      else seenIds.set(m.id, at);
    }

    if (!m.name) err(at, "缺少 name");

    /* 角色 */
    const roleList = Array.isArray(m.roles) ? m.roles : m.roles ? [m.roles] : [];
    if (roleList.length === 0) {
      err(at, "缺少 roles（角色列表，如 roles: [UGL]）");
    } else if (roleKeys.size > 0) {
      for (const key of roleList) {
        if (!roleKeys.has(key)) {
          err(at, `角色「${key}」没有在 content/roles.yml 里定义。可用：${[...roleKeys].join("、")}`);
        }
      }
    }

    /* 坐标 */
    if (m.location !== undefined && m.location !== null) {
      const loc = m.location;
      if (!Array.isArray(loc) || loc.length < 2 || loc.some((n) => typeof n !== "number")) {
        err(at, "location 必须是两个数字：[纬度, 经度]，例如 [39.9042, 116.4074]");
      } else {
        const [lat, lng] = loc;
        if (lat < -90 || lat > 90) err(at, `纬度 ${lat} 超出范围（应在 -90 ~ 90），你可能把经纬度写反了`);
        if (lng < -180 || lng > 180) err(at, `经度 ${lng} 超出范围（应在 -180 ~ 180）`);
      }
    } else {
      warn(at, "没有 location，这个人不会出现在地图上");
    }

    /* 头像 */
    if (m.avatar) {
      const v = String(m.avatar).trim();
      const isRemote = /^(https?:)?\/\//i.test(v);
      const isRoot = v.startsWith("/");
      if (!isRemote && !isRoot) {
        const filename = v.replace(/^\.?\/?(content\/)?(images\/)?/, "").split("/").pop();
        if (!localImages.has(filename)) {
          err(
            at,
            `头像「${v}」在 content/images/ 里找不到。` +
              (localImages.size
                ? ` 现有文件：${[...localImages].sort().join("、")}`
                : " 该目录还没有图片。")
          );
        }
      }
    }

    /* 链接：这是手写最容易出错的地方 */
    if (m.homepage && !/^https?:\/\//i.test(String(m.homepage))) {
      err(at, `homepage「${m.homepage}」必须以 http:// 或 https:// 开头，否则会被当成无效链接丢掉`);
    }

    if (m.links !== undefined && m.links !== null) {
      if (!Array.isArray(m.links)) {
        err(at, "links 必须是列表。没有链接就写 links: [] 或整行删掉");
      } else {
        m.links.forEach((l, j) => {
          const lat2 = `${at} 的第 ${j + 1} 个 link`;
          if (!l || typeof l !== "object") {
            err(lat2, "每个链接要写成两行：label 和 url");
            return;
          }
          if (!l.label) err(lat2, "缺少 label（按钮上显示的文字）");
          if (!l.url) err(lat2, "缺少 url");
          else if (!/^https?:\/\//i.test(String(l.url))) {
            err(lat2, `url「${l.url}」必须以 http:// 或 https:// 开头`);
          }
        });
      }
    }

    /* 内容完整性提醒 */
    if (!m.bio) warn(at, "没有 bio，详情弹窗里会显示「暂无介绍」");
    if (!Array.isArray(m.skills) || m.skills.length === 0) warn(at, "没有 skills，卡片上不显示技能标签");
  });
}

/* ---------- 输出 ---------- */
const line = "─".repeat(56);
console.log(line);
console.log(`内容校验：${memberFiles.length} 个名单文件，共 ${memberCount} 位成员`);
console.log(line);

if (warnings.length) {
  console.log(`\n提醒（不影响构建，${warnings.length} 条）：`);
  for (const w of warnings) console.log(`  · ${w.file}\n    ${w.msg}`);
}

if (errors.length) {
  console.log(`\n必须修正（${errors.length} 条）：`);
  for (const e of errors) console.log(`  ✗ ${e.file}\n    ${e.msg}`);
  console.log(`\n${line}`);
  console.log("校验未通过。改完再提交一次就好，字段说明见 content/members/heroes.yml 顶部注释。");
  process.exit(1);
}

console.log("\n✓ 全部通过");
process.exit(0);
