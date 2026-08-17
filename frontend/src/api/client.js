// ===== API クライアント（axios 版） =====
// バックエンドとの通信はすべてここを通る。
// 認証トークンの付与と、エラーの日本語化をここに集約する。
import axios from "axios";
import { useAppStore } from "@/store";

const client = axios.create({
  // 開発時は .env.local の VITE_API_BASE。Vercel では環境変数に
  // Railway の URL を入れる。
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  // ⚠️ withCredentials は付けない。認証は Cookie ではなく Authorization
  //   ヘッダーで行う（backend の SecurityConfig は allowCredentials(false)）。
  //   true にすると CORS のプリフライトが通らなくなる。
});

// ---- 送信前: 保存してあるトークンを載せる ----
client.interceptors.request.use((config) => {
  // ⚠️ React の外なので useAppStore(...) ではなく getState()。
  //   フックはコンポーネントの中でしか呼べない。
  const token = useAppStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- 受信後: 本文だけ返す / 失敗は Error にして投げる ----
client.interceptors.response.use(
  (res) => res.data,
  (error) => {
    // ⚠️ 401 = トークンが無効か期限切れ。保存を消して、
    //   RequireAuth にログイン画面へ送らせる。
    if (error.response?.status === 401) {
      useAppStore.getState().clearSession();
    }

    // backend の GlobalExceptionHandler が { "message": "…" } を返す。
    // ⚠️ 通信自体が届かない場合は error.response が無い。そこを区別しないと
    //   「サーバー未起動」が「エラーが発生しました」に化けて原因が分からなくなる。
    const message =
      error.response?.data?.message ??
      (error.response ? "エラーが発生しました" : "サーバーに接続できません");

    return Promise.reject(new Error(message));
  }
);

export default client;
