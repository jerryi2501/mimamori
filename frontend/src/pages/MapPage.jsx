import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Bell, Plus, Settings } from "lucide-react";
import {
  TILE_LIGHT,
  TILE_DARK,
  TILE_ATTRIBUTION,
  MAX_ZOOM,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@/lib/mapConfig";
import { fetchMembers, fetchUnreadCount, fetchGroup } from "@/api";
import { useAppStore } from "@/store";
import { subscribe } from "@/lib/realtime";
import { createMemberIcon } from "@/components/map/memberIcon";
import MemberList from "@/components/map/MemberList";
import MapControls from "@/components/map/MapControls";

/**
 * SC-M01 マップ（ホーム）
 * アプリの中心画面。全画面の地図の上に UI を重ねる。
 */
export default function MapPage() {
  const [members, setMembers] = useState([]);
  const [group, setGroup] = useState(null);
  const [map, setMap] = useState(null);
  const isNight = useAppStore((state) => state.isNight);
  // 未読件数は store に置く。通知画面で既読にしたら、ここも自動で 0 になる
  const unread = useAppStore((state) => state.unreadCount);
  const setUnreadCount = useAppStore((state) => state.setUnreadCount);
  const currentGroupId = useAppStore((state) => state.currentGroupId);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount().then(setUnreadCount);
  }, [setUnreadCount]);

  useEffect(() => {
    // 登録直後はまだどのグループにも入っていない
    if (!currentGroupId) {
      setMembers([]);
      setGroup(null);
      return;
    }
    fetchMembers(currentGroupId).then(setMembers);
    // ⚠️ 見出しは実際のグループ名にする。「家族」と決め打ちしていたが、
    //   バイト先や友人のグループを開いている人には嘘になる
    fetchGroup(currentGroupId).then(setGroup);
  }, [currentGroupId]);

  // ⭐ リアルタイム（企画書 §6）。家族が動くと、こちらの地図が自動で追いつく
  useEffect(() => {
    if (!currentGroupId) return;

    return subscribe(`/topic/group/${currentGroupId}/location`, (update) => {
      setMembers((prev) =>
        prev.map((member) =>
          // ⚠️ 一覧を取り直さない。名前や役割は変わっていないので、
          //   その人の位置の部分だけ上書きする
          member.id === update.userId ? { ...member, ...update } : member
        )
      );
    });
  }, [currentGroupId]);

  /** ピンまたは一覧の行から SC-M02 メンバー詳細へ移動する */
  const openMember = (id) => navigate(`/member/${id}`);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ===== 背景の地図 ===== */}
      <MapContainer
        ref={setMap}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="absolute inset-0 h-full w-full"
      >
        {/* ⚠️ key を変えないと react-leaflet は url の差し替えを反映しない */}
        <TileLayer
          key={isNight ? "dark" : "light"}
          url={isNight ? TILE_DARK : TILE_LIGHT}
          className={isNight ? "mm-tiles-dark" : undefined}
          attribution={TILE_ATTRIBUTION}
          maxZoom={MAX_ZOOM}
        />
        {/* ⚠️ 共有オフ・位置未送信の人は lat/lng が null。そのまま Marker に
            渡すと Leaflet が例外を投げ、地図ごと真っ白になる。
            一覧のほうには「共有オフ」として残す（隠さない）。 */}
        {members
          .filter((member) => member.lat != null && member.lng != null)
          .map((member) => (
            <Marker
              key={member.id}
              position={[member.lat, member.lng]}
              icon={createMemberIcon(member)}
              eventHandlers={{ click: () => openMember(member.id) }}
            />
          ))}
      </MapContainer>

      {/* ===== トップバー（地図の上に重ねる） ===== */}
      <header className="bg-surface border-line absolute inset-x-0 top-0 z-[1000] flex items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          aria-label="設定"
          onClick={() => navigate("/settings")}
          className="text-ink"
        >
          <Settings size={22} strokeWidth={2} />
        </button>

        <h1 className="text-ink text-lg font-bold">ShareMe</h1>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={unread > 0 ? `通知 ${unread}件の未読` : "通知"}
            onClick={() => navigate("/notifications")}
            className="text-ink relative"
          >
            <Bell size={22} strokeWidth={2} />
            {/* 0件のときは出さない */}
            {unread > 0 && (
              <span className="bg-alert border-surface absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label="メンバーを追加"
            onClick={() => navigate("/groups")}
            className="text-ink"
          >
            <Plus size={22} strokeWidth={2} />
          </button>
        </div>
      </header>

      <MapControls
        map={map}
        onOpenChat={() => navigate("/chat")}
        onSos={() => navigate("/sos")}
      />

      {/* ===== ボトムシート ===== */}
      <section className="bg-surface shadow-sheet absolute inset-x-0 bottom-0 z-[1000] flex h-[42%] flex-col rounded-t-2xl">
        {/* つまみ */}
        <div className="flex justify-center py-2">
          <div className="bg-ink-muted h-1 w-9 rounded-full" />
        </div>

        {/* 見出し */}
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-ink text-base font-bold">{group?.name ?? "グループ"}</h2>
          <button type="button" className="text-brand text-sm font-semibold">
            編集
          </button>
        </div>

        {/* 一覧（はみ出したらスクロール） */}
        <div className="flex-1 overflow-y-auto">
          {/* ⚠️ 行き止まりにしない。登録直後はここに来るので、次にやることを示す */}
          {!currentGroupId ? (
            <div className="flex flex-col items-center gap-3 px-6 py-8">
              <p className="text-ink-sub text-center text-sm">
                まだグループに参加していません
              </p>
              <button
                type="button"
                onClick={() => navigate("/groups")}
                className="bg-brand rounded-lg px-4 py-2.5 text-sm font-bold text-white"
              >
                グループを作る・参加する
              </button>
            </div>
          ) : (
            <MemberList members={members} onSelect={openMember} />
          )}
        </div>
      </section>
    </div>
  );
}
