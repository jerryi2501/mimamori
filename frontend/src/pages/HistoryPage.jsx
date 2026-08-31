import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import FitBounds from "@/components/map/FitBounds";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import {
  TILE_LIGHT,
  TILE_DARK,
  TILE_ATTRIBUTION,
  MAX_ZOOM,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@/lib/mapConfig";
import { fetchMember, fetchHistory } from "@/api";
import {
  formatDayLabel,
  formatTime,
  formatDuration,
  movementLabel,
} from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { createMemberIcon } from "@/components/map/memberIcon";
import { useAppStore } from "@/store";

/**
 * SC-M03 位置履歴
 * 上に経路の地図、下に「滞在」と「移動」が交互に並ぶタイムライン。
 */
export default function HistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNight = useAppStore((state) => state.isNight);
  const currentGroupId = useAppStore((state) => state.currentGroupId);

  const [member, setMember] = useState(null);
  const [events, setEvents] = useState([]);
  const [dayOffset, setDayOffset] = useState(0); // 0=今日, -1=昨日
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([fetchMember(currentGroupId, id), fetchHistory(id, dayOffset)]).then(
      ([foundMember, foundEvents]) => {
        if (!alive) return;
        setMember(foundMember);
        setEvents(foundEvents);
        setLoading(false);
      }
    );

    return () => {
      alive = false;
    };
  }, [id, dayOffset, currentGroupId]);

  // 表示中の日付
  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  // 地図に描く線。※ useMemo しないと毎回「別の配列」になり、
  //   FitBounds の useEffect が無限に走ってしまう
  const path = useMemo(
    () => events.filter((e) => e.type === "move").flatMap((e) => e.path),
    [events]
  );

  // 合計はデータから計算する。API に持たせると数字がずれる元になる
  const totalMeters = events
    .filter((e) => e.type === "move")
    .reduce((sum, e) => sum + e.distanceMeters, 0);
  const stayCount = events.filter((e) => e.type === "stay").length;

  return (
    <div className="bg-canvas flex h-full flex-col">
      {/* ===== ヘッダー ===== */}
      <header className="bg-surface border-line flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
        <button
          type="button"
          aria-label="戻る"
          onClick={() => navigate("/history")}
          className="text-ink flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-ink flex-1 text-center text-[15px] font-bold">
          {member ? `${member.name}の移動履歴` : "移動履歴"}
        </h1>
        {/* 左のボタンと幅を合わせて、タイトルを中央に保つための余白 */}
        <div className="w-9 shrink-0" />
      </header>

      {/* ===== 地図 ===== */}
      <div className="relative h-[32%] shrink-0">
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
          {path.length > 0 && (
            <>
              <Polyline
                positions={path}
                pathOptions={{ className: "mm-path", weight: 4 }}
              />
              {member && (
                <Marker position={path.at(-1)} icon={createMemberIcon(member)} />
              )}
            </>
          )}
          <FitBounds positions={path} />
        </MapContainer>
      </div>

      {/* ===== 日付の切り替え ===== */}
      <div className="bg-surface border-line flex shrink-0 items-center justify-between border-b px-4 py-2.5">
        <span className="text-ink text-[15px] font-bold">{formatDayLabel(date)}</span>
        <div className="flex gap-1">
          <DayButton
            label="前の日"
            Icon={ChevronLeft}
            onClick={() => setDayOffset((prev) => prev - 1)}
          />
          <DayButton
            label="次の日"
            Icon={ChevronRight}
            onClick={() => setDayOffset((prev) => prev + 1)}
            // 未来は見せない
            disabled={dayOffset >= 0}
          />
        </div>
      </div>

      {/* ===== タイムライン ===== */}
      <div className="bg-surface min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        {loading ? (
          <p className="text-ink-sub py-10 text-center text-sm">読み込み中…</p>
        ) : events.length === 0 ? (
          <p className="text-ink-muted py-10 text-center text-sm">
            この日の記録はありません
          </p>
        ) : (
          <ul>
            {events.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isLast={index === events.length - 1}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ===== 合計 ===== */}
      {!loading && events.length > 0 && (
        <div className="bg-surface border-line text-ink-sub shrink-0 border-t px-4 py-3 text-center text-xs">
          {dayOffset === 0 ? "本日" : "この日"}の移動距離{" "}
          <b className="text-ink">{formatDistance(totalMeters)}</b> ・ 滞在{" "}
          <b className="text-ink">{stayCount}か所</b>
        </div>
      )}
    </div>
  );
}

/** 日付を前後させる小さな丸ボタン */
function DayButton({ label, Icon, onClick, disabled }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="text-ink-sub flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  );
}

/** タイムラインの1件（滞在 or 移動）*/
function TimelineItem({ event, isLast }) {
  const isStay = event.type === "stay";

  return (
    <li className="flex gap-3">
      {/* 左のレール（点と点線）*/}
      <div className="relative flex w-3 shrink-0 justify-center">
        <span
          className={`z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
            isStay ? "bg-brand" : "border-line bg-surface border-2"
          }`}
        />
        {!isLast && (
          <span className="border-line absolute top-5 bottom-0 border-l border-dashed" />
        )}
      </div>

      {/* 本文 */}
      <div className="min-w-0 flex-1 pb-6">
        <div className="text-ink-sub text-xs">
          {formatTime(event.startAt)} 〜 {formatTime(event.endAt)}（
          {formatDuration(event.startAt, event.endAt)}）
        </div>

        {isStay ? (
          <div className="mt-0.5 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-ink text-[15px] font-bold">{event.placeName}</div>
              <div className="text-ink-sub truncate text-xs">{event.address}</div>
            </div>
            <button
              type="button"
              aria-label={`${event.placeName}を地図で見る`}
              className="bg-brand-soft text-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            >
              <MapPin size={16} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <>
            <div className="text-ink mt-0.5 text-[15px] font-bold">
              {formatDistance(event.distanceMeters)} 移動
              <span className="text-ink-sub ml-1.5 text-xs font-semibold">
                {movementLabel(event.movement)}
              </span>
            </div>
            <div className="bg-subtle mt-2 rounded-lg px-3 py-2">
              <RoutePoint label={event.fromPlace} />
              <RoutePoint label={event.toPlace} />
            </div>
          </>
        )}
      </div>
    </li>
  );
}

/** 移動の「どこから・どこへ」の1行 */
function RoutePoint({ label }) {
  return (
    <div className="text-ink-sub flex items-center gap-2 py-0.5 text-xs">
      <span className="bg-ink-muted h-1.5 w-1.5 shrink-0 rounded-full" />
      {label}
    </div>
  );
}
