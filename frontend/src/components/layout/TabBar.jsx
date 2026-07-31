import { NavLink } from "react-router-dom";
import { History, Map, MapPin, Settings } from "lucide-react";

/** 下部タブの定義。増やすときはここに1行足すだけ。 */
const TABS = [
  { to: "/", label: "マップ", Icon: Map },
  { to: "/places", label: "場所", Icon: MapPin },
  { to: "/history", label: "履歴", Icon: History },
  { to: "/settings", label: "設定", Icon: Settings },
];

/**
 * 画面下部のタブバー。
 * 4つのタブ画面で共通して表示される（TabLayout から呼ばれる）。
 */
export default function TabBar() {
  return (
    <nav className="bg-surface border-line flex shrink-0 border-t pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          // 「/」は前方一致だと常に active になってしまうため、完全一致にする
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold ${
              isActive ? "text-brand" : "text-ink-muted"
            }`
          }
        >
          {/* lucide のアイコンは stroke="currentColor" なので、
              上の text-* クラスに合わせて自動で色が変わる */}
          <Icon size={22} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
