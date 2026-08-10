import { create } from "zustand";

/** テーマ設定の保存キー（localStorage）*/
const THEME_KEY = "mimamori:themeMode";

/** ログイン情報の保存キー（localStorage）*/
const USER_KEY = "mimamori:user";

/**
 * localStorage からログイン情報を読む。
 * ⚠️ 中身は利用者が書き換えられる。壊れていてもアプリは動かす
 */
function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * グローバル状態（zustand）。
 * ※ 企画確定後に必要な状態を追加していく。
 */
export const useAppStore = create((set) => ({
  /**
   * ログイン中のユーザー（未ログインは null）。
   *
   * TODO [BACKEND] 実際はここに JWT も持つ。
   *   localStorage は XSS に弱いので、本番は httpOnly Cookie が望ましい。
   *   ポートフォリオでは実装の分かりやすさを優先して localStorage にする。
   */
  user: loadUser(),
  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
  clearUser: () => {
    localStorage.removeItem(USER_KEY);
    set({ user: null });
  },

  // ---- テーマ（企画書 §1.5 / デザインガイドライン §1.5）----
  /** 'auto' | 'light' | 'dark' — 設定画面から変更できる。既定は auto */
  themeMode: localStorage.getItem(THEME_KEY) ?? "auto",
  setThemeMode: (mode) => {
    localStorage.setItem(THEME_KEY, mode);
    set({ themeMode: mode });
  },

  /** 実際に今、夜テーマかどうか。useTimeTheme が更新する */
  isNight: false,
  setIsNight: (isNight) => set({ isNight }),

  // ---- 表示中のグループ ----
  /**
   * 地図やメンバー詳細が「どのグループの話か」を持つ。
   * 複数グループに入れる仕様（SC-G01）なので、固定値にはできない。
   *
   * TODO [BACKEND] ログイン後に既定グループを受け取って設定する。
   *   グループ切替UIを作ったら、そこからも更新する。
   */
  currentGroupId: 1,
  setCurrentGroupId: (currentGroupId) => set({ currentGroupId }),

  // ---- 通知の未読件数（SC-N01）----
  /**
   * 地図のベルのバッジと通知一覧が、同じ数字を見るための置き場。
   * 画面ごとに数えると、既読にしても他の画面が古い数字を出し続ける。
   */
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  clearUnreadCount: () => set({ unreadCount: 0 }),
}));
