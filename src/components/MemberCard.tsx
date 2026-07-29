/**
 * 成员卡片
 *
 * 整卡可点开详情。原来的实现是给 <article> 挂 onClick，
 * 键盘用户点不到；这里改成卡内一个覆盖整卡的 button，
 * 「主页」链接盖在它上层，两个操作互不抢焦点。
 */
import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Member, Role } from "../content/types";
import { alpha, rolesOf, safeUrl } from "../lib/utils";
import { Avatar } from "./Avatar";
import "./MemberCard.css";

interface MemberCardProps {
  member: Member;
  primary: Role;
  onOpen: (id: string) => void;
  /** 网格入场动画的序号 */
  index: number;
  reducedMotion: boolean;
}

/** 卡片数量多，用 memo 避免搜索时全量重渲染 */
export const MemberCard = memo(function MemberCard({
  member,
  primary,
  onOpen,
  index,
  reducedMotion,
}: MemberCardProps) {
  const homepage = safeUrl(member.homepage);
  const badges = rolesOf(member);
  // 技能超过 4 个就折叠，卡片高度才能保持整齐
  const visibleSkills = member.skills.slice(0, 4);
  const restCount = member.skills.length - visibleSkills.length;

  return (
    <motion.article
      className="member-card"
      id={`member-${member.id}`}
      style={
        {
          "--card-color": primary.color,
          "--card-tint": alpha(primary.color, 0.14),
          "--card-glow": alpha(primary.color, 0.3),
        } as React.CSSProperties
      }
      initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        // 逐个错开 50ms 形成波浪，但最多延迟 400ms，
        // 否则筛完剩最后几张会等太久
        delay: reducedMotion ? 0 : Math.min(index * 0.05, 0.4),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* 顶部一条角色主色的高光 */}
      <span className="card-rim" aria-hidden="true" />

      <div className="card-badges">
        {badges.map((role) => (
          <span
            className="role-badge"
            key={role.key}
            style={{ "--badge-color": role.color } as React.CSSProperties}
            title={role.description}
          >
            {role.short}
          </span>
        ))}
      </div>

      <div className="card-head">
        <Avatar member={member} color={primary.color} />
        <div className="card-ident">
          <h3 className="card-name">
            {member.name}
            {member.nickname && <span className="card-nickname">@{member.nickname}</span>}
          </h3>
          {member.title && <p className="card-title">{member.title}</p>}
        </div>
      </div>

      {member.city && (
        <p className="card-city">
          <MapPin size={13} aria-hidden="true" />
          {member.city}
        </p>
      )}

      {member.skills.length > 0 && (
        <div className="skill-tags card-skills">
          {visibleSkills.map((skill) => (
            <span className="skill-tag" key={skill}>
              {skill}
            </span>
          ))}
          {restCount > 0 && <span className="skill-tag skill-tag--more">+{restCount}</span>}
        </div>
      )}

      {/* 覆盖整卡的触发按钮：点卡片任意处都能打开详情，
          同时可以 Tab 聚焦、回车触发。可见文字在下方 foot 里，
          所以这里用 aria-label 提供无障碍名称。 */}
      <button
        type="button"
        className="card-overlay"
        onClick={() => onOpen(member.id)}
        aria-label={`查看 ${member.name} 的详细介绍`}
      />

      <div className="card-foot">
        <span className="card-more" aria-hidden="true">
          查看详情
          <ArrowUpRight size={14} />
        </span>

        {homepage && (
          <a
            className="card-home"
            href={homepage}
            target="_blank"
            rel="noopener noreferrer"
          >
            主页
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </motion.article>
  );
});
