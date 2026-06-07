## 问题

登录后顶部直接显示一个醒目的 "Sign out" 按钮，等于在引导用户退出。应该改成显示用户头像（优先 Google profile 图），点击展开下拉菜单，里面才放"退出登录"。

## 方案

新建一个复用组件 `src/components/moodtail/UserMenu.tsx`：
- 未登录：保留现在的小 "登录 / Sign in" 胶囊按钮，点击跳 `/auth`。
- 已登录：渲染一个圆形头像按钮（28–32px）：
  - 头像 src 取自 `user.user_metadata.avatar_url`（Google）或 `picture`，加载失败/没有就回退到用户名/邮箱首字母（用 shadcn `Avatar` + `AvatarFallback`）。
  - 点击用 shadcn `DropdownMenu` 弹出菜单：
    - 顶部一行只读信息：显示名（`full_name` / `name` / 邮箱前缀）+ 邮箱小字。
    - "我的酒柜 / My Bar" → 跳 `/gallery`。
    - 分隔线。
    - "退出登录 / Sign out"（红色文字）→ `supabase.auth.signOut()` + toast。
  - 中英文跟随 `useLang`。

然后在 3 个位置用这个组件替换现有的"登录/退出"按钮，保持原有定位和右侧语言切换布局：
1. `src/components/screens/LandingScreen.tsx` —— 顶部右上角。
2. `src/components/screens/GalleryScreen.tsx` —— 顶部右上 `LangToggle` 旁边（新增）。
3. 暂不动 `BottomNav`（它没有 sign out 按钮，只在未登录时弹 AuthModal，行为正确）。

## 仅前端改动

- 不改数据库、不改路由、不改 AuthModal、不动字体。
- 不引入新依赖，复用已有的 `avatar.tsx` 和 `dropdown-menu.tsx`。