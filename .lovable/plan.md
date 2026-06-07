## Problem

`AuthModal` 由 `BottomNav` 的 `showAuth` state 控制。用户登录成功后，`useAuth` 里的 `user` 会更新，但 `showAuth` 仍然是 `true`，弹窗不会自动关闭。`LandingScreen` 里的 My Bar 入口也有相同问题。

## Fix

在 `AuthModal` 内部加一个 effect：监听 auth 状态，一旦检测到登录成功的 `SIGNED_IN` 事件（或 session 出现），自动调用 `onClose()`。这样所有调用方（BottomNav、LandingScreen、GalleryScreen）都能自动关闭，无需各自加逻辑。

### 改动文件

- **`src/components/moodtail/AuthModal.tsx`**：
  - 增加 `useEffect`，订阅 `supabase.auth.onAuthStateChange`，当事件为 `SIGNED_IN` 且 `open` 为 true 时调用 `onClose()`。
  - 同时移除 email/password 登录成功后那次手动 `onClose()`（变成由 effect 统一处理，避免重复）。

### 不动的地方

- `GalleryScreen` 中 `onClose={() => {}}` 的行为依然保留——但登录后弹窗仍会通过新 effect 自动关掉，然后页面 re-render 显示 gallery 内容，符合预期。
- 不修改字体、不改路由、不动业务逻辑。