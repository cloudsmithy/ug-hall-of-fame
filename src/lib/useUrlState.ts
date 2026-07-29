/**
 * 把「筛选 + 搜索 + 选中成员」整体同步到 URL
 *
 * 目的是让任何一屏都可以原样分享出去：
 *   ?role=UGL&q=北京              → 打开即已筛好「北京的 UGL」
 *   #member-zhang-wei             → 打开即弹出张伟的详情
 *   ?role=UGL#member-li-shaoyi    → 两者可以叠加
 *
 * 分工：query 存筛选条件，hash 存当前打开的人。
 * 这样「改筛选」和「开关弹窗」互不干扰，前进后退的语义也清楚。
 *
 * 历史记录策略：
 *   - 开关弹窗   → pushState，所以「后退」是关弹窗而不是退出站点
 *   - 改筛选/搜索 → replaceState，否则每敲一个字都压一条历史，
 *                  后退键就废了
 */
import { useCallback, useEffect, useRef, useState } from "react";

const MEMBER_PREFIX = "member-";
const ROLE_KEY = "role";
const QUERY_KEY = "q";

export interface UrlState {
  /** 角色筛选，"ALL" 表示不筛 */
  role: string;
  /** 搜索关键词 */
  keyword: string;
  /** 当前打开详情的成员 id */
  memberId: string | null;
}

interface Validators {
  isValidRole: (role: string) => boolean;
  isValidMember: (id: string) => boolean;
}

/** 从当前地址读出完整状态，非法值一律回落到默认 */
function readUrl({ isValidRole, isValidMember }: Validators, allRole: string): UrlState {
  const params = new URLSearchParams(window.location.search);

  const rawRole = params.get(ROLE_KEY) ?? "";
  const role = rawRole && isValidRole(rawRole) ? rawRole : allRole;

  const keyword = params.get(QUERY_KEY) ?? "";

  const rawHash = window.location.hash.replace(/^#/, "");
  let memberId: string | null = null;
  if (rawHash.startsWith(MEMBER_PREFIX)) {
    const id = decodeURIComponent(rawHash.slice(MEMBER_PREFIX.length));
    // 地址栏是用户可改的，id 写错不该让弹窗停在空状态
    if (id && isValidMember(id)) memberId = id;
  }

  return { role, keyword, memberId };
}

/** 把状态拼成地址（默认值不写进 URL，保持链接干净） */
function buildUrl(state: UrlState, allRole: string): string {
  const params = new URLSearchParams();
  if (state.role !== allRole) params.set(ROLE_KEY, state.role);
  if (state.keyword.trim()) params.set(QUERY_KEY, state.keyword.trim());

  const query = params.toString();
  const hash = state.memberId
    ? `#${MEMBER_PREFIX}${encodeURIComponent(state.memberId)}`
    : "";

  const { origin, pathname } = window.location;
  return `${origin}${pathname}${query ? `?${query}` : ""}${hash}`;
}

/** 拼出某个成员的分享地址，保留当前的筛选条件 */
export function memberUrl(id: string, role: string, keyword: string, allRole: string): string {
  return buildUrl({ role, keyword, memberId: id }, allRole);
}

export function useUrlState(validators: Validators, allRole: string) {
  // 初始值直接从地址读：带链接进来就是「一进门已就位」，
  // 而不是先渲染默认视图再跳一下
  const [state, setState] = useState<UrlState>(() => readUrl(validators, allRole));

  // 自己写地址时会触发 popstate/hashchange，要能区分「我改的」和「用户改的」
  const writingRef = useRef(false);
  // 校验函数每次渲染都是新引用，放进 ref 免得反复重绑监听
  const validatorsRef = useRef(validators);
  validatorsRef.current = validators;

  // 下面几个回调都要读「当前 state」，但不能把 state 放进依赖里：
  // 否则每次状态变化都换出新引用，被 memo 的卡片会全部重渲染
  const stateRef = useRef(state);
  stateRef.current = state;

  /* ---------- 地址变化（前进后退、手改地址栏）→ 更新状态 ---------- */
  useEffect(() => {
    const sync = () => {
      if (writingRef.current) {
        writingRef.current = false;
        return;
      }
      setState(readUrl(validatorsRef.current, allRole));
    };

    // popstate 管前进后退，hashchange 管手动改 hash
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [allRole]);

  /** 统一的写入口：push 决定是否留下一条历史记录 */
  const write = useCallback(
    (next: UrlState, push: boolean) => {
      setState(next);
      const url = buildUrl(next, allRole);
      if (url === window.location.href) return;
      writingRef.current = true;
      if (push) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
      // pushState / replaceState 都不触发事件，标记要立刻放掉，
      // 否则会残留 true 把用户下一次的前进后退吞掉
      writingRef.current = false;
    },
    [allRole]
  );

  /* ---------- 对外的几个动作 ---------- */

  // 开关弹窗进历史：后退 = 关弹窗
  const openMember = useCallback(
    (id: string) => write({ ...stateRef.current, memberId: id }, true),
    [write]
  );
  const closeMember = useCallback(
    () => write({ ...stateRef.current, memberId: null }, false),
    [write]
  );

  /**
   * 弹窗内翻上/下一位时用这个，而不是 openMember。
   * 翻页是同一次「浏览行为」里的连续动作，逐条压历史的话
   * 连翻十个人再按后退要按十次才能回到名单。
   */
  const replaceMember = useCallback(
    (id: string) => write({ ...stateRef.current, memberId: id }, false),
    [write]
  );

  // 改筛选不进历史，但要顺手关掉弹窗：
  // 筛选变了还挂着一个可能已被筛掉的人，看着很怪
  const setRole = useCallback(
    (role: string) => write({ ...stateRef.current, role, memberId: null }, false),
    [write]
  );
  const setKeyword = useCallback(
    (keyword: string) => write({ ...stateRef.current, keyword, memberId: null }, false),
    [write]
  );
  const reset = useCallback(
    () => write({ role: allRole, keyword: "", memberId: null }, false),
    [write, allRole]
  );

  return { state, openMember, replaceMember, closeMember, setRole, setKeyword, reset };
}
