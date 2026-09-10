/**
 * 名人卡片墙
 */
import { AnimatePresence } from "framer-motion";
import { SearchX } from "lucide-react";
import type { Member } from "../content/types";
import { primaryRole } from "../content";
import { MemberCard } from "./MemberCard";
import "./Roster.css";

interface RosterProps {
  members: Member[];
  onOpen: (id: string) => void;
  reducedMotion: boolean;
  /** 当前关键词，用于空状态给出针对性提示 */
  keyword: string;
  onReset: () => void;
}

export function Roster({ members, onOpen, reducedMotion, keyword, onReset }: RosterProps) {
  if (members.length === 0) {
    return (
      <div className="roster-empty glass">
        <SearchX size={32} aria-hidden="true" />
        <p className="roster-empty-title">
          {keyword ? `没有匹配「${keyword}」的成员` : "当前筛选条件下没有成员"}
        </p>
        {/* 死胡同要给出路：告诉用户还能怎么搜 */}
        <p className="roster-empty-hint">
          试试搜索城市（如「北京」）、技能（如「Serverless」），或者换个角色筛选。
        </p>
        <button type="button" className="roster-empty-btn" onClick={onReset}>
          清空筛选条件
        </button>
      </div>
    );
  }

  return (
    <div className="roster-grid">
      {/* popLayout 让被筛掉的卡片先退场，剩下的再补位，
          不会出现两张卡重叠的瞬间 */}
      <AnimatePresence mode="popLayout">
        {members.map((member, i) => (
          <MemberCard
            key={member.id}
            member={member}
            primary={primaryRole(member)}
            onOpen={onOpen}
            index={i}
            reducedMotion={reducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * 卡片墙外层区块（标题 + 网格）
 *
 * 这里刻意不做 whileInView 的淡入：内容的可见性一旦依赖动画触发，
 * 滚动检测没命中就等于整块内容消失。卡片自己已有错开入场，
 * 区块再套一层只是装饰。
 */
export function RosterSection({
  title,
  hint,
  children,
}: {
  title: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {hint && <p className="section-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
