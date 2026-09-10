# 怎么给名人榜加人

**加人、改人、删人都只需要改 YAML，不用写代码、不用装环境。**
在 GitHub 网页上就能改完提交。

---

## 最快的方式：网页直接改

1. 打开 `content/members/` 下的一个文件：
   - `heroes.yml` —— Community Hero
   - `leaders.yml` —— UGL / UGA / UGO（主理人、大使、组织者）
   - `builders.yml` —— Community Builder / 志愿者

   按被收录人的身份挑一个。**分文件只是为了好维护，最终会合并成一份名单**，
   放在哪个文件不影响显示效果 —— 一个人属于什么角色，只由 `roles` 字段决定。

2. 点右上角的铅笔图标（Edit this file）

3. 在文件**末尾**追加一段（注意 `- ` 那个横杠加空格）：

```yaml
- id: wang-min
  name: 王敏
  nickname: K8sMin
  roles: [UGL]
  title: 成都 User Group · 主理人
  city: 成都
  avatar: ""
  skills: [容器, EKS, 社区运营, Kubernetes]
  bio: 西南地区云原生布道者，带动成都 User Group 从 0 成长到 2000+ 成员。
  homepage: https://example.com/wangmin
  links: []
```

4. 点 **Commit changes**，选 "Create a new branch and start a pull request"

5. 提交后等一分钟，页面上会出现 CI 的检查结果：
   - ✅ 绿勾 —— 等合并就行
   - ❌ 红叉 —— 点 Details 看报错，它会直接告诉你哪一行写错了什么。改完再提交一次即可

---

## 字段怎么写

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 唯一标识，**小写英文 + 连字符**，如 `wang-min`。这是分享链接的一部分（`#member-wang-min`），定了之后别改 |
| `name` | ✅ | 姓名 |
| `roles` | ✅ | 角色列表，取值见下方。多身份写 `[UGL, HERO]` |
| `nickname` | | 昵称 / 社区 ID，显示在姓名旁，也能被搜到 |
| `title` | | 一句话头衔 |
| `city` | | 所在城市，显示用，也能被搜到 |
| `avatar` | | 头像，见「加头像」 |
| `skills` | | 技能标签，如 `[Serverless, 社区运营]` |
| `bio` | | 人物介绍，一段话 |
| `homepage` | | 个人主页，弹窗底部那个大按钮 |
| `links` | | 其他链接，见「links 怎么写」 |

### 可用的角色

| key | 含义 |
|---|---|
| `HERO` | Community Hero |
| `UGL` | User Group Leader（主理人） |
| `UGA` | User Group Ambassador（大使） |
| `UGO` | User Group Organizer（组织者） |
| `CB` | Community Builder |
| `VOL` | 志愿者 |

多身份的人，**第一个决定卡片配色**，其余作为附加徽章。
比如 `roles: [UGL, HERO]` 是橙色卡片 + 一个金色 Hero 徽章。

要加新角色就改 `content/roles.yml`，格式照着现有的写。

### links 怎么写

`links` 是除个人主页之外的其他链接，每项两个字段：

```yaml
# 没有别的链接
links: []

# 一个
links:
  - label: 博客
    url: https://blog.example.com

# 多个
links:
  - label: 博客
    url: https://blog.example.com
  - label: GitHub
    url: https://github.com/wangmin
  - label: 知乎
    url: https://zhihu.com/people/wangmin
```

- `- ` 横杠加空格表示「一项的开始」，`label` 和 `url` 要缩进对齐
- `label` 随便写中文（博客、微博、公众号、B站…）
- `url` **必须以 `https://` 开头**，写 `blog.example.com` 会被当成无效链接丢掉

### 加头像

三种写法：

```yaml
# 1. 本地照片（推荐）：图上传到 content/images/，这里只写文件名
avatar: wangmin.jpg

# 2. 在线照片：完整链接
avatar: https://avatars.githubusercontent.com/u/1?v=4

# 3. 留空：自动用姓名首字生成色块，也挺好看
avatar: ""
```

推荐第 1 种，构建时会自动加缓存哈希。照片**裁成正方形**效果最好
（显示尺寸是 52×52 和 76×76，会按 cover 裁切）。

在 GitHub 网页上传图片：进 `content/images/` 目录 → Add file → Upload files。

---

## 在本地跑（可选）

想先看看效果再提交：

```bash
npm install
npm run dev        # 打开 http://localhost:5173
```

改完 YAML 存盘，页面会自己刷新。

提交前自查：

```bash
npm run validate   # 校验 YAML，报错会指出具体哪一行
```

---

## 几件请注意的事

**先问过当事人。** 名人榜是公开页面，姓名、城市、照片都是个人信息。
如果你在帮别人提交，请先获得他同意。

**`id` 定了别改。** 它是分享链接的一部分。改了之后别人之前分享出去的
`#member-xxx` 链接就失效了（不会报错，只是打不开那个人的详情）。

**一个 PR 做一件事。** 加三个人可以放一个 PR，但「加人」和「改站点文案」
最好分开提，方便回溯。

**改代码的 PR 请先开 issue 说一下。** 只改 YAML 的直接提就行。

---

有任何写不明白的地方，直接开个 issue 问，或者先提 PR 让 CI 告诉你哪里不对 ——
CI 报错是免费的，随便试。
