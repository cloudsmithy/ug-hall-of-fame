/**
 * 应用入口组件
 *
 * 全部状态都存在 URL 里，由 useUrlState 统一管：
 *   ?role=UGL&q=北京            筛选条件 → 决定 filtered 列表
 *   #member-zhang-wei           打开详情的人 → 驱动弹窗和地图飞行
 *
 * 好处是任何一屏都能原样分享，前进后退也符合直觉。
 */
import { useCallback, useMemo } from "react";
import { Map as MapIcon, Users } from "lucide-react";
import { members, roles, site } from "./content";
import { useDebounced, useReducedMotion } from "./lib/hooks";
import { useUrlState } from "./lib/useUrlState";
import { Header } from "./components/Header";
import { Toolbar, ALL_ROLES } from "./components/Toolbar";
import { CommunityMap } from "./components/CommunityMap";
import { Roster, RosterSection } from "./components/Roster";
import { MemberModal } from "./components/MemberModal";
import { Footer } from "./components/Footer";

/** 用于校验 URL 里的值是否真实存在，写错就回落到默认 */
const memberIds = new Set(members.map((m) => m.id));
const roleKeys = new Set(roles.map((r) => r.key));
const validators = {
  isValidMember: (id: string) => memberIds.has(id),
  isValidRole: (key: string) => key === ALL_ROLES || roleKeys.has(key),
};

export default function App() {
  const {
    state: { role: activeRole, keyword, memberId: selectedId },
    openMember: handleOpen,
    replaceMember,
    closeMember: handleClose,
    setRole: setActiveRole,
    setKeyword,
    reset: handleReset,
  } = useUrlState(validators, ALL_ROLES);

  const reducedMotion = useReducedMotion();
  // 打字时不必每个字符都重算，停 180ms 再筛
  const debouncedKeyword = useDebounced(keyword);

  /** 各角色人数，筛选胶囊上显示，与成员名单一起算好 */
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const role of roles) {
      counts[role.key] = members.filter((m) => m.roles.includes(role.key)).length;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const kw = debouncedKeyword.trim().toLowerCase();
    return members.filter((m) => {
      if (activeRole !== ALL_ROLES && !m.roles.includes(activeRole)) return false;
      // searchText 在内容加载时预拼好，这里只做一次 includes
      return !kw || m.searchText.includes(kw);
    });
  }, [activeRole, debouncedKeyword]);

  const selected = useMemo(
    () => (selectedId ? members.find((m) => m.id === selectedId) ?? null : null),
    [selectedId]
  );

  /**
   * 弹窗里翻上/下一位时的候选队列。
   *
   * 用 filtered 而不是 members：翻页顺序应该跟着用户眼前的名单，
   * 筛了「北京的 UGL」就只在这几个人里翻。
   *
   * 但带分享链接进来时，那个人可能被当前筛选挡在外面（比如链接带了
   * ?role=CB 却指向一位 UGL）。这时候把他并进队列，
   * 否则会出现「弹窗开着、但翻页找不到自己」的错乱。
   */
  const navList = useMemo(() => {
    if (!selected) return filtered;
    return filtered.some((m) => m.id === selected.id) ? filtered : [selected, ...filtered];
  }, [filtered, selected]);

  const navIndex = selected ? navList.findIndex((m) => m.id === selected.id) : -1;

  const handleNavigate = useCallback(
    (delta: number) => {
      if (navIndex < 0 || navList.length < 2) return;
      // 首尾环绕，翻到最后一位再按「下一位」回到第一位
      const next = (navIndex + delta + navList.length) % navList.length;
      // 用 replace 而不是 push：连翻十个人后按一次后退就该回到名单，
      // 而不是倒着重放这十个人
      replaceMember(navList[next].id);
    },
    [navIndex, navList, replaceMember]
  );

  return (
    <div className="page">
      <div className="ambient" aria-hidden="true" />

      <a className="skip-link" href="#main">
        跳到主内容
      </a>

      <Header site={site} roles={roles} members={members} />

      <main id="main">
        <div className="container">
          <Toolbar
            roles={roles}
            activeRole={activeRole}
            onRoleChange={setActiveRole}
            keyword={keyword}
            onKeywordChange={setKeyword}
            counts={roleCounts}
            resultCount={filtered.length}
            totalCount={members.length}
          />

          <RosterSection
            title={
              <>
                <MapIcon size={18} aria-hidden="true" />
                {site.sections.map}
              </>
            }
            hint={site.sections.mapHint}
            // 一个命中都没有时折叠地图：空地球占着半屏高度，
            // 会把「没找到」的提示和出路挤到首屏之外。
            // 这里只是隐藏，不卸载组件，用户的缩放位置得以保留。
            collapsed={filtered.length === 0}
          >
            {/* 地图跟着筛选一起变，筛选后只显示命中的成员 */}
            <CommunityMap
              members={filtered}
              site={site}
              onOpen={handleOpen}
              focusId={selectedId}
            />
          </RosterSection>

          <RosterSection
            title={
              <>
                <Users size={18} aria-hidden="true" />
                {site.sections.roster}
              </>
            }
            hint={site.sections.rosterHint}
          >
            <Roster
              members={filtered}
              onOpen={handleOpen}
              reducedMotion={reducedMotion}
              keyword={debouncedKeyword.trim()}
              onReset={handleReset}
            />
          </RosterSection>
        </div>
      </main>

      <Footer site={site} />

      <MemberModal
        member={selected}
        onClose={handleClose}
        reducedMotion={reducedMotion}
        onNavigate={handleNavigate}
        position={navIndex >= 0 ? { index: navIndex, total: navList.length } : null}
        shareContext={{ role: activeRole, keyword, allRole: ALL_ROLES }}
      />
    </div>
  );
}
