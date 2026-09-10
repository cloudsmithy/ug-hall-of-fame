/**
 * 内容层类型定义
 *
 * 这些类型描述的是 content/ 目录下 YAML 解析后的形状。
 * YAML 手写难免有缺字段的情况，所以带 ? 的都是可选，
 * 由 index.ts 里的归一化逻辑补默认值。
 */

/** 一条外部链接 */
export interface LinkItem {
  label: string;
  url: string;
}

/** 角色定义，对应 content/roles.yml 的一项 */
export interface Role {
  key: string;
  label: string;
  short: string;
  color: string;
  description: string;
  order: number;
}

/** 成员，对应 content/members/*.yml 的一项（归一化后） */
export interface Member {
  id: string;
  name: string;
  nickname: string;
  /** 角色 key 列表，至少一项；第一项为主身份，决定配色 */
  roles: string[];
  title: string;
  city: string;
  /**
   * 头像 src，已解析成可直接用的 URL：
   * content/images/ 下的本地图会带内容哈希，在线图原样保留。
   * 没写头像或文件找不到时为 null，退回首字色块。
   */
  avatar: string | null;
  skills: string[];
  bio: string;
  homepage: string;
  links: LinkItem[];
  /** 归一化时生成：搜索用的小写字符串，避免每次筛选重复拼接 */
  searchText: string;
}

/** 站点配置，对应 content/site.yml（归一化后） */
export interface SiteConfig {
  title: string;
  subtitle: string;
  kicker: string;
  tagline: string;
  sections: {
    roster: string;
    rosterHint: string;
  };
  footer: {
    text: string;
    links: LinkItem[];
  };
}
