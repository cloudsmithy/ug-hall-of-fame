/**
 * 页头：品牌标题 + KPI 统计条 + 角色图例
 */
import { motion } from "framer-motion";
import { MapPin, Sparkles, Users } from "lucide-react";
import type { Member, Role, SiteConfig } from "../content/types";
import "./Header.css";

interface HeaderProps {
  site: SiteConfig;
  roles: Role[];
  members: Member[];
}

interface Stat {
  value: number;
  label: string;
  color?: string;
}

export function Header({ site, roles, members }: HeaderProps) {
  const cityCount = new Set(members.map((m) => m.city).filter(Boolean)).size;

  // 总人数 + 覆盖城市 + 各角色人数
  const stats: Stat[] = [
    { value: members.length, label: "社区名人" },
    { value: cityCount, label: "覆盖城市" },
    ...roles.map((role) => ({
      value: members.filter((m) => m.roles.includes(role.key)).length,
      label: role.short,
      color: role.color,
    })),
  ];

  return (
    <header className="site-header">
      <div className="container header-inner">
        <motion.div
          className="brand"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="brand-kicker">
            <Sparkles size={13} aria-hidden="true" />
            {site.kicker}
          </span>
          <h1 className="brand-title">{site.title}</h1>
          <p className="brand-subtitle">{site.subtitle}</p>
          {site.tagline && <p className="brand-tagline">{site.tagline}</p>}
        </motion.div>

        {/* KPI 统计条 */}
        <motion.dl
          className="stat-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          {stats.map((stat, i) => (
            <div
              className="stat"
              key={stat.label}
              // 前两项是总量，用主色；后面按角色色着色
              style={{ "--stat-color": stat.color ?? "var(--accent)" } as React.CSSProperties}
            >
              <dt className="stat-label">
                {i === 0 && <Users size={12} aria-hidden="true" />}
                {i === 1 && <MapPin size={12} aria-hidden="true" />}
                {stat.label}
              </dt>
              <dd className="stat-value">{stat.value}</dd>
            </div>
          ))}
        </motion.dl>

        {/* 角色图例：说明每个颜色代表什么身份 */}
        <motion.ul
          className="legend"
          aria-label="角色说明"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.16 }}
        >
          {roles.map((role) => (
            <li className="legend-item" key={role.key}>
              <span
                className="legend-dot"
                style={{ background: role.color }}
                aria-hidden="true"
              />
              <span className="legend-short">{role.short}</span>
              <span className="legend-label">{role.label}</span>
              {/* 角色说明用原生 title 提示，移动端点不到也不影响理解，
                  因为完整名称已经写在旁边 */}
              <span className="legend-tip" title={role.description} aria-hidden="true">
                ?
              </span>
              <span className="sr-only">{role.description}</span>
            </li>
          ))}
        </motion.ul>
      </div>
    </header>
  );
}
