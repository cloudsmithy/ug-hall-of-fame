/**
 * 成员详情弹窗
 *
 * 无障碍要点：
 *   - role="dialog" + aria-modal + aria-labelledby
 *   - 打开时把焦点移进弹窗，关闭时还给触发的那张卡片
 *   - Tab 在弹窗内循环（焦点陷阱），ESC 与点遮罩都能关
 *   - ← → 方向键翻上/下一位
 *   - 打开期间锁滚动
 */
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import type { Member } from "../content/types";
import { primaryRole } from "../content";
import { alpha, rolesOf, safeUrl } from "../lib/utils";
import { useScrollLock } from "../lib/hooks";
import { Avatar } from "./Avatar";
import { CopyLinkButton } from "./CopyLinkButton";
import "./MemberModal.css";

/** 复制链接时要带上的筛选上下文，让分享出去的链接保留当前视图 */
export interface ShareContext {
  role: string;
  keyword: string;
  allRole: string;
}

interface MemberModalProps {
  member: Member | null;
  onClose: () => void;
  reducedMotion: boolean;
  /** 翻页：-1 上一位，+1 下一位 */
  onNavigate: (delta: number) => void;
  /** 当前是第几位 / 共几位；只有一个人时为 null，不显示翻页 */
  position: { index: number; total: number } | null;
  shareContext: ShareContext;
}

/** 弹窗内可聚焦元素的选择器 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MemberModal({
  member,
  onClose,
  reducedMotion,
  onNavigate,
  position,
  shareContext,
}: MemberModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // 记住打开弹窗前的焦点，关闭后还回去
  const lastFocused = useRef<HTMLElement | null>(null);

  const open = member !== null;
  useScrollLock(open);

  // 翻页时 member 会变，但弹窗一直挂载着；把最新的回调放进 ref，
  // 免得为了拿到新函数而重绑整套键盘监听（会连带重置焦点）
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;
  const canNavigate = (position?.total ?? 0) > 1;
  const canNavigateRef = useRef(canNavigate);
  canNavigateRef.current = canNavigate;

  useEffect(() => {
    if (!open) return;

    lastFocused.current = document.activeElement as HTMLElement | null;
    // 等一帧，动画开始后元素已挂载，再把焦点移进来
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // ← → 翻上/下一位。
      // 在输入框里按方向键是移动光标，不该被劫持 —— 弹窗里目前没有
      // 输入框，但加上这个判断，以后加了也不会出问题。
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const el = document.activeElement;
        const typing =
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          (el instanceof HTMLElement && el.isContentEditable);
        if (typing || !canNavigateRef.current) return;
        e.preventDefault();
        navigateRef.current(e.key === "ArrowLeft" ? -1 : 1);
        return;
      }

      if (e.key !== "Tab") return;

      // 焦点陷阱：Tab 到最后一个再往后就回到第一个，反之亦然
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      // 还原焦点，键盘用户不会被丢回页面顶部
      lastFocused.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          // 只有点在遮罩本身（而非弹窗内部）时才关闭
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <ModalPanel
            ref={panelRef}
            member={member}
            onClose={onClose}
            reducedMotion={reducedMotion}
            onNavigate={onNavigate}
            position={canNavigate ? position : null}
            shareContext={shareContext}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ModalPanelProps {
  member: Member;
  onClose: () => void;
  reducedMotion: boolean;
  onNavigate: (delta: number) => void;
  position: { index: number; total: number } | null;
  shareContext: ShareContext;
  ref: React.Ref<HTMLDivElement>;
}

function ModalPanel({
  member,
  onClose,
  reducedMotion,
  onNavigate,
  position,
  shareContext,
  ref,
}: ModalPanelProps) {
  const primary = primaryRole(member);
  const badges = rolesOf(member);
  const homepage = safeUrl(member.homepage);
  const links = member.links
    .map((l) => ({ ...l, href: safeUrl(l.url) }))
    .filter((l): l is typeof l & { href: string } => l.href !== null);

  return (
    <motion.div
      ref={ref}
      className="modal-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
      style={
        {
          "--card-color": primary.color,
          "--card-tint": alpha(primary.color, 0.16),
          "--card-glow": alpha(primary.color, 0.34),
        } as React.CSSProperties
      }
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // 退场比入场快一档，关闭时感觉更利落
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* 复制链接 + 关闭，作为一组放在右上角 */}
      <div className="modal-actions">
        <CopyLinkButton
          memberId={member.id}
          name={member.name}
          shareContext={shareContext}
        />
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭详情">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <header className="modal-head">
        <Avatar member={member} color={primary.color} size="lg" />
        <div className="modal-ident">
          <div className="modal-badges">
            {badges.map((role) => (
              <span
                className="role-badge"
                key={role.key}
                style={{ "--badge-color": role.color } as React.CSSProperties}
              >
                {role.short}
              </span>
            ))}
          </div>
          <h2 className="modal-name" id="modal-title">
            {member.name}
            {member.nickname && <span className="modal-nickname">@{member.nickname}</span>}
          </h2>
          {member.title && <p className="modal-title-line">{member.title}</p>}
          {member.city && (
            <p className="modal-city">
              <MapPin size={13} aria-hidden="true" />
              {member.city}
            </p>
          )}
        </div>
      </header>

      <div className="modal-body">
        <section className="modal-section">
          <h3 className="modal-section-title">身份</h3>
          <p className="modal-roles">{badges.map((r) => r.label).join(" · ")}</p>
        </section>

        <section className="modal-section">
          <h3 className="modal-section-title">人物介绍</h3>
          <p className="modal-bio">{member.bio || "暂无介绍"}</p>
        </section>

        {member.skills.length > 0 && (
          <section className="modal-section">
            <h3 className="modal-section-title">技能</h3>
            <div className="skill-tags">
              {member.skills.map((skill) => (
                <span className="skill-tag" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {links.length > 0 && (
          <section className="modal-section">
            <h3 className="modal-section-title">链接</h3>
            <div className="modal-links">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-link"
                >
                  {link.label}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>

      {homepage && (
        <a
          className="modal-cta"
          href={homepage}
          target="_blank"
          rel="noopener noreferrer"
        >
          访问个人主页
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}

      {/* 翻页：只有当前名单不止一个人时才出现 */}
      {position && (
        <nav className="modal-nav" aria-label="在当前名单中切换成员">
          <button
            type="button"
            className="modal-nav-btn"
            onClick={() => onNavigate(-1)}
            aria-label="上一位成员"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            上一位
          </button>

          <span className="modal-nav-count">
            {/* index 从 0 开始，显示给人看要 +1 */}
            {position.index + 1}
            <span className="modal-nav-sep">/</span>
            {position.total}
          </span>

          <button
            type="button"
            className="modal-nav-btn"
            onClick={() => onNavigate(1)}
            aria-label="下一位成员"
          >
            下一位
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
    </motion.div>
  );
}
