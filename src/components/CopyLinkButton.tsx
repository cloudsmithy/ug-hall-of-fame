/**
 * 复制分享链接按钮
 *
 * 点一下把 `…/#member-<id>` 写进剪贴板，按钮短暂变成「已复制」。
 */
import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { memberUrl } from "../lib/useUrlState";
import type { ShareContext } from "./MemberModal";
import "./CopyLinkButton.css";

/** 剪贴板 API 不可用时的兜底（http 环境、旧浏览器都会遇到） */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    // navigator.clipboard 只在 https / localhost 下存在
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 用户拒了权限，走下面的兜底
  }

  try {
    // 老办法：塞一个隐藏 textarea，选中后 execCommand("copy")
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

interface CopyLinkButtonProps {
  memberId: string;
  name: string;
  /** 当前筛选条件，一并写进链接，分享出去的视图和自己看到的一致 */
  shareContext: ShareContext;
}

export function CopyLinkButton({ memberId, name, shareContext }: CopyLinkButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timerRef = useRef<number | undefined>(undefined);

  // 翻到下一位时按钮不卸载，要把「已复制」状态清掉，
  // 否则会让人以为复制的是新这个人的链接
  useEffect(() => {
    setState("idle");
    window.clearTimeout(timerRef.current);
  }, [memberId]);

  // 组件卸载（弹窗关闭）时清掉定时器，避免对已卸载组件 setState
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleCopy = async () => {
    const url = memberUrl(
      memberId,
      shareContext.role,
      shareContext.keyword,
      shareContext.allRole
    );
    const ok = await writeClipboard(url);
    setState(ok ? "copied" : "failed");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState("idle"), 2000);
  };

  const label =
    state === "copied" ? "链接已复制" : state === "failed" ? "复制失败" : `复制 ${name} 的分享链接`;

  return (
    <button
      type="button"
      className={`copy-link${state === "copied" ? " is-copied" : ""}${
        state === "failed" ? " is-failed" : ""
      }`}
      onClick={handleCopy}
      // 图标按钮必须有可读的名称，且随状态变化
      aria-label={label}
      title={label}
    >
      {state === "copied" ? (
        <Check size={16} aria-hidden="true" />
      ) : (
        <Link2 size={16} aria-hidden="true" />
      )}
      {/* 复制结果朗读给读屏用户，视觉上不占位 */}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "链接已复制到剪贴板" : state === "failed" ? "复制失败，请手动复制地址栏" : ""}
      </span>
    </button>
  );
}
