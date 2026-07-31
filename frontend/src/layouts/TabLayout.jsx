import { Outlet } from "react-router-dom";
import TabBar from "@/components/layout/TabBar";

/**
 * タブ付き画面の共通レイアウト。
 * 上に各画面（Outlet）、下にタブバーを置く。
 *
 * TabBar をここに1回だけ置くことで、タブを切り替えても
 * バー自体は再描画されない（ちらつかない）。
 */
export default function TabLayout() {
  return (
    <div className="flex h-svh flex-col">
      {/* min-h-0 がないと、中身がタブバーを画面外へ押し出してしまう */}
      <main className="relative min-h-0 flex-1">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
