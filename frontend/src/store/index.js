import { create } from "zustand";

/** テーマ設定の保存キー（localStorage）*/
const THEME_KEY = "mimamori:themeMode";

/** ログイン情報の保存キー（localStorage）*/
const USER_KEY = "mimamori:user";
const TOKEN_KEY = "mimamori:token";
const GROUP_KEY = "mimamori:groupId";

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
 */
export const useAppStore = create((set) => ({
  /**
   * ログイン中のユーザー（未ログインは null）。
   *
   * ⚠️ トークンを localStorage に置くのは XSS に弱い。本番なら httpOnly
   *   Cookie が望ましいが、ポートフォリオでは実装の分かりやすさを優先する。
   */
  user: loadUser(),
  token: localStorage.getItem(TOKEN_KEY),

  /**
   * ログイン・登録の成功時。サーバーの応答（token を含む）をそのまま渡す。
   *
   * ⚠️ token を user の中に残さない。画面は user をそのまま表示に使うので、
   *   混ざるとトークンが画面に出る事故につながる。
   */
  setSession: ({ token, ...user }) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  /** ログアウト、または 401 を受け取ったとき */
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(GROUP_KEY);
    set({ token: null, user: null, currentGroupId: null });
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
   * ⚠️ 数値で持つ。localStorage は文字列しか返さないので Number() で戻す。
   *   "1" のまま比較すると member.id === myId のような等値判定が壊れる。
   *   グループ未参加（登録直後）は null。
   */
  currentGroupId: Number(localStorage.getItem(GROUP_KEY)) || null,
  setCurrentGroupId: (currentGroupId) => {
    // ⚠️ null をそのまま渡すと文字列 "null" が保存される。消すのが正しい
    if (currentGroupId == null) {
      localStorage.removeItem(GROUP_KEY);
    } else {
      localStorage.setItem(GROUP_KEY, String(currentGroupId));
    }
    set({ currentGroupId });
  },

  // ---- 通知の未読件数（SC-N01）----
  /**
   * 地図のベルのバッジと通知一覧が、同じ数字を見るための置き場。
   * 画面ごとに数えると、既読にしても他の画面が古い数字を出し続ける。
   */
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  clearUnreadCount: () => set({ unreadCount: 0 }),
}));
