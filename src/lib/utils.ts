/**
 * 小工具函数
 */
import type { Member, Role } from "../content/types";
import { getRole } from "../content";

/** 姓名首字，用于生成占位头像 */
export const initialOf = (name: string): string =>
  (name || "?").trim().charAt(0) || "?";

/** 成员的全部角色对象（保持 YAML 里的书写顺序） */
export const rolesOf = (member: Member): Role[] => member.roles.map(getRole);

/**
 * 只允许 http/https 链接。
 * YAML 是手写的，万一写进 javascript: 之类的伪协议，
 * 这里直接拦掉，避免变成点击即执行的 XSS。
 */
export function safeUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

/**
 * 把十六进制色转成 rgba，用于生成同色系的柔和背景 / 光晕。
 * 解析失败时退回主色，保证不出现 undefined 的样式值。
 */
export function alpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(255, 153, 0, ${a})`;

  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");

  const num = parseInt(h, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
