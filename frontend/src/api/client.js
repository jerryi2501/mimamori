// ===== API クライアント（axios 版） =====
// バックエンド API への共通通信処理。
// 共通レスポンス形式 { success, data, message } をここで処理し、
// 画面側には data だけを返す（失敗時は message を throw）。
import axios from "axios";

// baseURL: frontend/.env の VITE_API_BASE を使う。
// ローカル開発例: VITE_API_BASE=http://localhost:8000
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  // 認証は HttpOnly Cookie で行う想定のため Cookie を送受信する。
  // ※ クロスサイト（Vercel ↔ バックエンド）では、サーバー側で
  //   Cookie に SameSite=None; Secure を付ける必要がある。
  withCredentials: true,
});

// レスポンス後：{ success, data, message } を判定し、data だけ返す
instance.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && body.success === false) {
      return Promise.reject(new Error(body.message || "エラーが発生しました"));
    }
    return body?.data ?? body;
  },
  (err) => {
    // HTTPエラー（401/409/500 など）。サーバーが message を返していれば使う。
    const msg =
      err.response?.data?.message || err.message || "通信エラーが発生しました";
    return Promise.reject(new Error(msg));
  }
);

// 各メソッドのショートカット
export const api = {
  get: (path, config) => instance.get(path, config),
  post: (path, body, config) => instance.post(path, body, config),
  put: (path, body, config) => instance.put(path, body, config),
  del: (path, config) => instance.delete(path, config),
};
