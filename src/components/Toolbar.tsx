/**
 * 工具栏：搜索框 + 角色筛选胶囊
 */
import { Search, X } from "lucide-react";
import type { Role } from "../content/types";
import { alpha } from "../lib/utils";
import "./Toolbar.css";

export const ALL_ROLES = "ALL";

interface ToolbarProps {
  roles: Role[];
  /** 当前选中的角色 key，或 ALL_ROLES */
  activeRole: string;
  onRoleChange: (role: string) => void;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  /** 每个角色下的人数，显示在胶囊上 */
  counts: Record<string, number>;
  /** 当前筛选命中的人数 */
  resultCount: number;
  totalCount: number;
}

export function Toolbar({
  roles,
  activeRole,
  onRoleChange,
  keyword,
  onKeywordChange,
  counts,
  resultCount,
  totalCount,
}: ToolbarProps) {
  const filters = [
    { key: ALL_ROLES, short: "全部", color: "#ff9900", count: totalCount },
    ...roles.map((r) => ({
      key: r.key,
      short: r.short,
      color: r.color,
      count: counts[r.key] ?? 0,
    })),
  ];

  return (
    <div className="toolbar glass">
      <div className="search-field">
        <Search className="search-icon" size={17} aria-hidden="true" />
        <input
          id="member-search"
          className="search-input"
          type="search"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索姓名、昵称、城市或技能…"
          autoComplete="off"
          aria-label="搜索社区成员"
        />
        {keyword && (
          <button
            type="button"
            className="search-clear"
            onClick={() => onKeywordChange("")}
            aria-label="清空搜索"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 角色筛选：单选，语义上等价于一组 tab */}
      <div className="filter-row" role="tablist" aria-label="按角色筛选">
        {filters.map((f) => {
          const active = f.key === activeRole;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`filter-pill${active ? " is-active" : ""}`}
              onClick={() => onRoleChange(f.key)}
              style={
                {
                  "--pill-color": f.color,
                  "--pill-bg": alpha(f.color, 0.16),
                  "--pill-glow": alpha(f.color, 0.32),
                } as React.CSSProperties
              }
            >
              {f.short}
              <span className="filter-count">{f.count}</span>
            </button>
          );
        })}
      </div>

      {/* 实时结果数：让用户知道筛选生效了 */}
      <p className="result-count" role="status" aria-live="polite">
        共 <b>{resultCount}</b> 位
        {resultCount !== totalCount && <span> / {totalCount}</span>}
      </p>
    </div>
  );
}
