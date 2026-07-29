# UG 名人榜 · 亚马逊云科技 Community Hall of Fame

React + TypeScript + Vite 构建的社区名人榜。UGL / UGA / UGO / CB / Hero / 志愿者
的人物介绍、技能标签、角色徽章、个人主页跳转，以及基于 Leaflet 的真实地图打点。

**所有内容都在 `content/` 目录的 YAML 里，改内容不用碰代码。**

> 想加人？看 **[CONTRIBUTING.md](CONTRIBUTING.md)** —— 在 GitHub 网页上改个 YAML
> 提 PR 就行，不用装环境。

## 快速开始

```bash
npm install        # 首次
npm run dev        # 开发，默认 http://localhost:5173
npm run validate   # 校验 content/ 下的 YAML 有没有写错
npm run build      # 生产构建（会先跑校验），产物在 dist/
npm run preview    # 本地预览生产构建
npm run og         # 重新生成分享卡片配图（只在改了图的设计时需要）
```

## 改内容：只动 content/ 下的 YAML

```
content/
├── site.yml              站点标题、副标题、地图初始视角、各区块文案、页脚
├── roles.yml             角色定义（颜色、缩写、说明、排序）
├── images/               头像照片丢这里，YAML 里写文件名即可
│   └── sample-avatar.png
└── members/              成员名单，按类别分文件，最终会合并成一份
    ├── heroes.yml        Community Hero
    ├── leaders.yml       UGL / UGA / UGO
    └── builders.yml      Community Builder / 志愿者
```

### 加一个人

挑一个 `content/members/*.yml`，在数组末尾追加：

```yaml
- id: your-id                    # 唯一标识，建议英文小写连字符
  name: 张三
  nickname: SanZ                 # 可选，显示在姓名旁，也参与搜索
  roles: [UGL]                   # 取值见 roles.yml；多身份写 [UGL, HERO]
  title: 某地 User Group · 主理人
  city: 某地
  location: [39.9042, 116.4074]  # [纬度, 经度]；留空则不上地图
  avatar: zhangsan.jpg           # 见下方「加头像照片」；留空用姓名首字色块
  skills: [Serverless, 社区运营]
  bio: 一段人物介绍。
  homepage: https://example.com/zhangsan
  links:
    - label: 博客
      url: https://example.com
```

字段的完整说明写在 `content/members/heroes.yml` 顶部注释里。

**坐标怎么查**：Google 地图上右键任意位置，直接复制「纬度, 经度」。

### 加头像照片

三种写法都支持，留空则自动用姓名首字生成色块：

```yaml
# 1. 本地照片（推荐）：图丢进 content/images/，这里只写文件名
avatar: zhangsan.jpg

# 2. 在线照片：写完整链接
avatar: https://avatars.githubusercontent.com/u/1?v=4

# 3. public 目录：以 / 开头，原样发布不做处理
avatar: /zhangsan.jpg
```

推荐第 1 种。构建时会自动加内容哈希（`sample-avatar-kUrtu_UV.png`），
换图后浏览器不会读到旧缓存；4KB 以下的小图会内联成 data URI，省一次请求。

几个实际会遇到的情况：

- **文件名写错** → 退回首字色块，浏览器控制台点名是谁、并列出 `content/images/`
  下现有的文件名，不用逐个猜拼写
- **在线图挂了**（域名失效、防盗链） → 自动退回首字色块，不留破图
- **加载中** → 先显示首字色块，照片加载完淡入盖上，不会闪一块空白

照片建议裁成正方形（卡片里 52×52、弹窗里 76×76 显示，会按 `cover` 裁切）。

### 加一批人

直接往 `content/members/` 丢一个新的 `.yml`（比如 `students.yml`），
代码会自动带上，不需要改任何 import。

### 加一个新角色

在 `content/roles.yml` 追加一项，然后在成员的 `roles` 里引用它的 `key`。
颜色会自动应用到徽章、卡片描边、地图标记、KPI 数字和筛选胶囊。

多身份的成员（如 `roles: [UGL, HERO]`）以第一个作为主身份，决定卡片配色和
地图标记颜色，其余身份作为附加徽章展示。

### 容错

YAML 是手写的，所以内容加载层做了归一化：缺字段补默认值，坐标写错就当没坐标，
角色 key 拼错、成员 id 重复、头像文件名找不到，都会在浏览器控制台给出警告，
而不是静默变成一片空白。

## 分享：任何一屏都能原样发出去

整个视图状态都写在地址里，复制地址栏就是可分享的链接。

```
?role=UGL                    只看主理人
?role=UGL&q=北京              北京的主理人
#member-zhang-wei            直接弹出张伟的详情
?role=UGL#member-wang-min    上面两者叠加
```

弹窗右上角的「链」形按钮点一下就复制当前链接，**会带上你当前的筛选条件** ——
别人打开看到的和你看到的一样。

配套行为都验证过：

- 浏览器**后退**关掉弹窗、**前进**再打开，不会一路退出站点
- 改筛选和搜索用 `replaceState`，不会把后退键灌满历史记录
- 弹窗里翻页也用 `replaceState`：连翻十个人后按一次后退直接回名单，
  而不是倒着重放这十个人
- 地址栏里的值写错（`?role=NOPE`、`#member-不存在的人`）自动回落到默认，不报错
- 关闭弹窗会清掉 hash，地址栏不留一个孤零零的 `#`

因为 hash 前缀和卡片元素 id 一致，带链接打开时浏览器还会自动滚到那张卡片。

### 发到微信 / Slack 的预览卡片

链接发出去会显示标题、描述和一张 1200×630 的配图（Open Graph）。
内容在 `content/site.yml` 的 `share` 段：

```yaml
share:
  title: UG 名人榜 · 亚马逊云科技 Community Hall of Fame
  description: 记录每一位把云社区带到线下、带到身边的人 —— …
  siteUrl: https://ug-hall-of-fame.pages.dev   # 必填且不要带结尾斜杠
  image: /og-cover.jpg
```

**`siteUrl` 上线后要改成你的正式域名。** 微信、Twitter 这些平台不认相对路径，
配图地址得是绝对地址，所以这项填错就只有标题没有图 —— 校验器会提醒你没填，
但填错域名它查不出来。

配图由 `npm run og` 从 `scripts/og-cover.svg` 渲染（用本机 Chrome，为了中文字体
排版和浏览器一致）。改设计就改那个 SVG 再跑一次。生成好的图已经提交进仓库，
CI 不会重跑 —— CI 环境没有中文字体，渲出来是方框。

一个说清楚的限制：这是纯前端站，`#member-xxx` 是 hash，服务端看不到。所以
**分享单个人的链接，预览卡片显示的仍是站点通用信息**，做不到「显示张伟的头像和
介绍」。要那样得上 SSR 或预渲染，是另一个量级的改动。

### 弹窗里翻看

弹窗底部有「上一位 / 下一位」，也可以直接按 **← →** 方向键。翻页范围跟着当前
筛选 —— 筛了「北京的 UGL」就只在这几个人里翻，首尾环绕。

一个边界情况：分享链接带的筛选条件可能把链接指向的人本身挡在外面
（比如 `?role=CB#member-zhang-wei`，而张伟是 HERO）。这时候他会被并进翻页队列
（显示 `1/4`），不会出现「弹窗开着但翻页里找不到自己」的错乱。

## 让别人提 PR 加人

仓库已经配好了收 PR 的一套东西：

| 文件 | 作用 |
|---|---|
| `CONTRIBUTING.md` | 给贡献者看的：怎么改 YAML、字段怎么填、坐标怎么查 |
| `.github/PULL_REQUEST_TEMPLATE.md` | 提 PR 时自动带出的自查清单 |
| `.github/workflows/validate.yml` | PR 一提上来自动跑校验 + 构建 |
| `scripts/validate-content.mjs` | 校验脚本本体，本地跑 `npm run validate` |

校验器会抓这些手写错误，并且**报错指名到人**：

```
✗ content/members/builders.yml → 「王敏」
  角色「UGLL」没有在 content/roles.yml 里定义。可用：HERO、UGL、UGA、UGO、CB、VOL
✗ content/members/builders.yml → 「王敏」
  纬度 200 超出范围（应在 -90 ~ 90），你可能把经纬度写反了
✗ content/members/builders.yml → 「王敏」
  头像「不存在.jpg」在 content/images/ 里找不到。现有文件：sample-avatar.png
✗ content/members/builders.yml → 「王敏」 的第 1 个 link
  url「blog.example.com」必须以 http:// 或 https:// 开头
```

覆盖：id 缺失/重复/非法字符、角色未定义、坐标格式与经纬度写反、头像文件找不到、
链接缺 scheme、`links` 结构写错、YAML 语法错误。另有一类「提醒」不拦构建
（没写 bio、没有坐标不会上地图之类）。

所以流程是：**别人 fork → 改 YAML → 提 PR → CI 自动查 → 你点合并 → 自动部署。**
贡献者不用装 node，在 GitHub 网页上编辑 YAML 就能提。

## 部署到 Cloudflare Pages

先把仓库推到 GitHub（仓库已 `git init`，还没有 remote）：

```bash
git remote add origin git@github.com:<你的账号>/ug-hall-of-fame.git
git push -u origin main
```

然后二选一：

**A. Cloudflare Pages 连 Git（推荐，合并 PR 后自动部署）**

- 构建命令：`npm run build`
- 输出目录：`dist`

**部署完记得回来改一件事**：把 `content/site.yml` 里的 `share.siteUrl` 换成
Cloudflare 给你的正式域名，否则链接发到微信/Slack 时不会显示配图。

**B. 从本地推**

```bash
npx wrangler login   # 首次
npm run deploy       # = npm run build && wrangler pages deploy dist
```

## 代码结构

```
src/
├── content/         YAML 加载与归一化（types.ts 定义形状，index.ts 做校验，
│                    images.ts 把头像文件名解析成构建后的 URL）
├── components/      每个组件一个 .tsx + 同名 .css
├── lib/             hooks（防抖、减弱动效、滚动锁）、useUrlState、工具函数
├── styles/          tokens.css 设计令牌 + global.css 基础样式
├── App.tsx          组合各区块；状态本身存在 URL 里，由 useUrlState 管
└── main.tsx         启动，自托管字体
```

### 几个设计决定

- **设计令牌集中在 `src/styles/tokens.css`**，组件样式一律引用变量，不写裸色值。
  改主题只需要改这一个文件。
- **字体自托管**（`@fontsource-variable`），不依赖 Google Fonts，国内访问更稳。
- **Leaflet 动态导入**，183KB 的地图代码不进首屏包；加载失败会退回一句说明而不是白屏。
- **地图跟着筛选联动**，且一个结果都没有时会收起地图 —— 空地球占半屏高度会把
  「没找到」的提示挤出首屏。收起用的是 `hidden` 而非卸载，用户的缩放位置得以保留。
- **无障碍**：全站文本对比度 ≥ 5.18:1（WCAG AA 要求 4.5:1）；卡片整块可 Tab 聚焦并
  回车打开；弹窗有焦点陷阱、ESC 关闭、关闭后焦点归还触发元素；地图标记不占 Tab 位
  （地图是下方名单的冗余视图，否则键盘用户要按十几次才能走出地图）；
  尊重系统的「减弱动态效果」。

## 技术栈

React 19 · TypeScript · Vite 8 · framer-motion · Leaflet + markercluster ·
lucide-react · @modyfi/vite-plugin-yaml
