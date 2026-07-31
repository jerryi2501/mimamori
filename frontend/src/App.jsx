import { BrowserRouter, Routes, Route } from "react-router-dom";
import TabLayout from "@/layouts/TabLayout";
import MapPage from "@/pages/MapPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * ルーティング定義。
 * 画面を1つ作るたびに <Route> をここに追加していく。
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* タブ付きの4画面。TabLayout が共通の枠になる */}
        <Route element={<TabLayout />}>
          {/* SC-M01 マップ（ホーム）— アプリの中心画面 */}
          <Route path="/" element={<MapPage />} />
          <Route path="/places" element={<PlaceholderPage title="場所" />} />
          <Route path="/history" element={<PlaceholderPage title="履歴" />} />
          <Route path="/settings" element={<PlaceholderPage title="設定" />} />
        </Route>

        {/* 該当なし。必ず一番下に置く */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
