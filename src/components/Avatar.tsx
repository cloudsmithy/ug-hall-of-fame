/**
 * 头像：有图用图，没图（或图挂了）用姓名首字生成色块
 *
 * member.avatar 已在内容加载层解析好：
 * content/images/ 下的本地图是带哈希的 URL，在线图是原链接。
 */
import { useEffect, useState } from "react";
import type { Member } from "../content/types";
import { alpha, initialOf } from "../lib/utils";
import "./Avatar.css";

interface AvatarProps {
  member: Member;
  /** 主题色，取自成员主身份 */
  color: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ member, color, size = "md" }: AvatarProps) {
  const src = member.avatar;

  // 在线图片可能挂掉（域名变更、防盗链），退回首字头像而不是留下破图
  const [failed, setFailed] = useState(false);
  // 图片没加载完之前先垫上首字色块，避免出现一块空白再突然跳成照片
  const [loaded, setLoaded] = useState(false);

  // 同一个 Avatar 组件可能被复用给不同成员（弹窗切换、筛选重排），
  // src 变了要把状态清掉，否则前一个人的失败状态会误伤下一个人
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  const initialStyle = {
    background: `linear-gradient(140deg, ${alpha(color, 0.95)}, ${alpha(color, 0.6)})`,
    borderColor: alpha(color, 0.5),
  };

  if (!src || failed) {
    return (
      <div
        className={`avatar avatar--${size} avatar--initial`}
        // 首字头像是纯装饰，姓名就在旁边，不需要重复朗读
        aria-hidden="true"
        style={initialStyle}
      >
        {initialOf(member.name)}
      </div>
    );
  }

  return (
    <div className={`avatar-frame avatar-frame--${size}`}>
      {/* 加载完成前垫在底下的首字色块 */}
      {!loaded && (
        <div
          className={`avatar avatar--${size} avatar--initial avatar--placeholder`}
          aria-hidden="true"
          style={initialStyle}
        >
          {initialOf(member.name)}
        </div>
      )}
      <img
        className={`avatar avatar--${size} avatar--photo${loaded ? " is-loaded" : ""}`}
        src={src}
        alt={`${member.name} 的头像`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{ borderColor: alpha(color, 0.5) }}
      />
    </div>
  );
}
