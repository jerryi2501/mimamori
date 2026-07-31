import { create } from "zustand";

/**
 * グローバル状態（zustand）。
 * ※ 企画確定後に必要な状態を追加していく。
 */
export const useAppStore = create((set) => ({
  // ログイン中のユーザー（未ログインは null）
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
