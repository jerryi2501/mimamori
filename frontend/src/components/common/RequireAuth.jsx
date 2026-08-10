import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "@/store";

/**
 * 未ログインなら /login へ送る門番。
 *
 * <Route element={<RequireAuth />}> の中に入れた画面すべてに効く。
 * 1画面ずつ包む必要はない。
 */
export default function RequireAuth() {
  const user = useAppStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    // どこへ行こうとしたか覚えておき、ログイン後にそこへ戻す
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />; // 通過したら中の画面を描く
}
