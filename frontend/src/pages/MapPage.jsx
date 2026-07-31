import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Plus, Settings } from "lucide-react";
import {
  TILE_LIGHT,
  TILE_ATTRIBUTION,
  TILE_SUBDOMAINS,
  MAX_ZOOM,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@/lib/mapConfig";
import { fetchMembers } from "@/api/mockApi";
import { createMemberIcon } from "@/components/map/memberIcon";
import MemberList from "@/components/map/MemberList";
import MapControls from "@/components/map/MapControls";

/**
 * SC-M01 マップ（ホーム）
 * アプリの中心画面。全画面の地図の上に UI を重ねる。
 */
export default function MapPage() {
  const [members, setMembers] = useState([]);
  const [map, setMap] = useState(null);

  useEffect(() => {
    fetchMembers().then(setMembers);
  }, []);

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
        <TileLayer
          url={TILE_LIGHT}
          attribution={TILE_ATTRIBUTION}
          subdomains={TILE_SUBDOMAINS}
          maxZoom={MAX_ZOOM}
        />
        {members.map((member) => (
          <Marker
            key={member.id}
            position={[member.lat, member.lng]}
            icon={createMemberIcon(member)}
          />
        ))}
      </MapContainer>

      {/* ===== トップバー（地図の上に重ねる） ===== */}
      <header className="bg-surface border-line absolute inset-x-0 top-0 z-[1000] flex items-center justify-between border-b px-4 py-3">
        <button type="button" aria-label="設定" className="text-ink">
          <Settings size={22} strokeWidth={2} />
        </button>
        <h1 className="text-ink text-lg font-bold">みまもり</h1>
        <button type="button" aria-label="メンバーを追加" className="text-ink">
          <Plus size={22} strokeWidth={2} />
        </button>
      </header>

      <MapControls map={map} />

      {/* ===== ボトムシート ===== */}
      <section className="bg-surface shadow-sheet absolute inset-x-0 bottom-0 z-[1000] flex h-[42%] flex-col rounded-t-2xl">
        {/* つまみ */}
        <div className="flex justify-center py-2">
          <div className="bg-ink-muted h-1 w-9 rounded-full" />
        </div>

        {/* 見出し */}
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-ink text-base font-bold">家族</h2>
          <button type="button" className="text-brand text-sm font-semibold">
            編集
          </button>
        </div>

        {/* 一覧（はみ出したらスクロール） */}
        <div className="flex-1 overflow-y-auto">
          <MemberList members={members} />
        </div>
      </section>
    </div>
  );
}
