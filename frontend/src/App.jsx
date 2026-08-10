import { BrowserRouter, Routes, Route } from "react-router-dom";
import TabLayout from "@/layouts/TabLayout";
import RequireAuth from "@/components/common/RequireAuth";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import MapPage from "@/pages/MapPage";
import MemberDetailPage from "@/pages/MemberDetailPage";
import PlacesPage from "@/pages/PlacesPage";
import HistoryPickerPage from "@/pages/HistoryPickerPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ChatListPage from "@/pages/ChatListPage";
import ChatRoomPage from "@/pages/ChatRoomPage";
import SosPage from "@/pages/SosPage";
import PingPage from "@/pages/PingPage";
import GroupsPage from "@/pages/GroupsPage";
import GroupDetailPage from "@/pages/GroupDetailPage";
import PlaceEditPage from "@/pages/PlaceEditPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SosAlertPage from "@/pages/SosAlertPage";
import useTimeTheme from "@/hooks/useTimeTheme";

/**
 * ルーティング定義。
 * 画面を1つ作るたびに <Route> をここに追加していく。
 */
export default function App() {
  useTimeTheme(); // アプリ全体のテーマを時刻に合わせる

  return (
    <BrowserRouter>
      <Routes>
        {/* ===== SC-A01 / SC-A02 認証 — ログイン不要 ===== */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ===== ここから下はログインが必要 ===== */}
        <Route element={<RequireAuth />}>
          {/* タブ付きの4画面。TabLayout が共通の枠になる */}
          <Route element={<TabLayout />}>
            {/* SC-M01 マップ（ホーム）— アプリの中心画面 */}
            <Route path="/" element={<MapPage />} />
            {/* SC-P01 場所（セーフゾーン）*/}
            <Route path="/places" element={<PlacesPage />} />
            {/* SC-M03 位置履歴 */}
            <Route path="/history" element={<HistoryPickerPage />} />
            <Route path="/history/:id" element={<HistoryPage />} />
            {/* SC-T01 設定・プロフィール */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* SC-M02 メンバー詳細 — 全画面。タブバーは出さない */}
          <Route path="/member/:id" element={<MemberDetailPage />} />

          {/* SC-C01 / SC-C02 トーク（F-15）— 全画面。タブバーは出さない */}
          <Route path="/chat" element={<ChatListPage />} />
          <Route path="/chat/:id" element={<ChatRoomPage />} />

          {/* SC-S01 SOS発信 — 全画面 */}
          <Route path="/sos" element={<SosPage />} />
          {/* SC-S02 SOS受信・詳細 */}
          <Route path="/sos/:id" element={<SosAlertPage />} />

          {/* SC-M04 呼び出し受信（F-11）— 全画面オーバーレイ */}
          <Route path="/ping/:id" element={<PingPage />} />

          {/* SC-G01〜G03 グループ — 設定から入る全画面 */}
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />

          {/* SC-P02 場所登録・編集 — 全画面 */}
          <Route path="/places/new" element={<PlaceEditPage />} />
          <Route path="/places/:id/edit" element={<PlaceEditPage />} />

          {/* SC-N01 通知一覧 — 全画面 */}
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        {/* 該当なし。必ず一番下に置く。※ログイン不要 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
