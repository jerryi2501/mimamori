import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Circle, Marker } from "react-leaflet";
import {
  House,
  School,
  Briefcase,
  MapPin,
  Plus,
  ChevronRight,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  TILE_LIGHT,
  TILE_DARK,
  TILE_ATTRIBUTION,
  MAX_ZOOM,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@/lib/mapConfig";
import { fetchPlaces, fetchZoneEvents } from "@/api";
import { placeColor, formatEventTime } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { createPlaceIcon } from "@/components/map/placeIcon";
import FitBounds from "@/components/map/FitBounds";
import { useAppStore } from "@/store";
import { useNavigate } from "react-router-dom";

/** カテゴリごとのアイコン。※キーは大文字始まり（JSXの決まり）*/
const CATEGORY_ICON = {
  home: House,
  school: School,
  work: Briefcase,
  other: MapPin,
};

/**
 * SC-P01 場所（セーフゾーン）
 * 上に地図と円、下に地点一覧と入退室ログ。
 */
export default function PlacesPage() {
  const isNight = useAppStore((state) => state.isNight);

  const currentGroupId = useAppStore((state) => state.currentGroupId);

  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlaces(currentGroupId).then(setPlaces);
    fetchZoneEvents(currentGroupId).then(setEvents);
  }, [currentGroupId]);

  // ⚠️ useMemo 必須。毎回新しい配列だと FitBounds が無限ループする
  const centers = useMemo(
    () => places.map((place) => [place.lat, place.lng]),
    [places]
  );

  return (
    <div className="bg-canvas flex h-full flex-col">
      <header className="bg-surface border-line shrink-0 border-b px-4 py-3">
        <h1 className="text-ink text-lg font-bold">セーフゾーン</h1>
        <p className="text-ink-sub mt-0.5 text-xs">
          登録した場所に出入りするとお知らせします
        </p>
      </header>

      {/* ===== 地図 ===== */}
      <div className="relative h-[36%] shrink-0">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          scrollWheelZoom={false}
          className="absolute inset-0 h-full w-full"
        >
          <TileLayer
            key={isNight ? "dark" : "light"}
            url={isNight ? TILE_DARK : TILE_LIGHT}
            className={isNight ? "mm-tiles-dark" : undefined}
            attribution={TILE_ATTRIBUTION}
            maxZoom={MAX_ZOOM}
          />

          {/* 円とチップは対になるので PlaceShape にまとめる */}
          {places.map((place) => (
            <PlaceShape key={place.id} place={place} />
          ))}

          <FitBounds positions={centers} padding={50} />
        </MapContainer>
      </div>

      {/* ===== 一覧とログ ===== */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        {/* 登録した場所 */}
        <section className="bg-surface border-line mx-4 mt-3 overflow-hidden rounded-xl border">
          {places.map((place) => (
            <PlaceRow
              key={place.id}
              place={place}
              onClick={() => navigate(`/places/${place.id}/edit`)}
            />
          ))}
          {places.length === 0 && (
            <p className="text-ink-muted px-4 py-6 text-center text-sm">
              まだ場所が登録されていません
            </p>
          )}
        </section>

        {/* ⚠️ 追加ボタンは場所一覧のすぐ下に置く。以前は「ゾーン履歴」の
            あとに置いていたが、履歴は際限なく伸びるので、登録件数が増えるほど
            主要な操作が画面外へ押し出されていた（実機で気づいた） */}
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => navigate("/places/new")}
            disabled={!currentGroupId}
            className="bg-brand flex w-full items-center justify-center gap-1.5 rounded-xl py-3.5 text-[15px] font-bold text-white disabled:opacity-40"
          >
            <Plus size={18} strokeWidth={2.5} />
            新しい場所を追加
          </button>
          {/* ⚠️ 場所はグループに属する。グループが無いと登録先が決まらない */}
          {!currentGroupId && (
            <p className="text-ink-muted mt-2 text-center text-xs">
              先にグループを作るか、参加してください
            </p>
          )}
        </div>

        {/* ゾーン履歴 */}
        <div className="mt-6 flex items-center justify-between px-5">
          <h2 className="text-ink-sub text-xs font-semibold">ゾーン履歴</h2>
          <button type="button" className="text-brand text-xs font-semibold">
            すべて表示
          </button>
        </div>

        <section className="bg-surface border-line mx-4 mt-2 overflow-hidden rounded-xl border">
          {events.map((event) => (
            <ZoneEventRow key={event.id} event={event} />
          ))}
          {events.length === 0 && (
            <p className="text-ink-muted px-4 py-6 text-center text-sm">
              まだ出入りの記録がありません
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

/** 地図上の円＋中央の名前チップ */
function PlaceShape({ place }) {
  return (
    <>
      <Circle
        center={[place.lat, place.lng]}
        radius={place.radiusMeters}
        pathOptions={{
          className: `mm-zone mm-zone--${place.category}`,
          fillOpacity: 0.12,
          weight: 2,
        }}
      />
      <Marker position={[place.lat, place.lng]} icon={createPlaceIcon(place)} />
    </>
  );
}

/** 登録した場所の1行 */
function PlaceRow({ place, onClick }) {
  const Icon = CATEGORY_ICON[place.category] ?? MapPin;
  const color = placeColor(place.category);

  return (
    <button
      type="button"
      onClick={onClick}
      className="border-line flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        // 背景だけ薄くしたいので color-mix で 15% だけ混ぜる
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
      >
        <Icon size={20} strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-ink text-[15px] font-semibold">{place.name}</div>
        <span
          className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          {place.enabled ? "有効" : "無効"}
        </span>
      </div>

      <span className="text-ink-sub shrink-0 text-sm font-semibold">
        {formatDistance(place.radiusMeters)}
      </span>
      <ChevronRight size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
    </button>
  );
}

/** 入退室ログの1行 */
function ZoneEventRow({ event }) {
  const isEnter = event.type === "enter";

  return (
    <div className="border-line flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isEnter ? "bg-brand-soft text-brand" : "bg-subtle text-ink-sub"
        }`}
      >
        {isEnter ? (
          <LogIn size={14} strokeWidth={2} />
        ) : (
          <LogOut size={14} strokeWidth={2} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-ink truncate text-sm">
          <b className="font-semibold">{event.memberName}</b> が {event.placeName}
        </div>
      </div>

      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
          isEnter ? "bg-brand-soft text-brand" : "bg-subtle text-ink-sub"
        }`}
      >
        {isEnter ? "入室" : "退室"}
      </span>
      <span className="text-ink-muted shrink-0 text-[11px]">
        {formatEventTime(event.at)}
      </span>
    </div>
  );
}
