import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Circle, useMapEvents } from "react-leaflet";
import { ArrowLeft, House, School, Briefcase, MapPin, Trash2 } from "lucide-react";
import {
  TILE_LIGHT,
  TILE_DARK,
  TILE_ATTRIBUTION,
  TILE_SUBDOMAINS,
  MAX_ZOOM,
  DEFAULT_CENTER,
} from "@/lib/mapConfig";
import { fetchPlace, createPlace, updatePlace, deletePlace } from "@/api/mockApi";
import { formatDistance } from "@/lib/geo";
import { placeColor } from "@/lib/format";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useAppStore } from "@/store";

/** 種類の選択肢。色は index.css の --place-* に対応 */
const CATEGORIES = [
  { value: "home", label: "家", Icon: House },
  { value: "school", label: "学校", Icon: School },
  { value: "work", label: "職場", Icon: Briefcase },
  { value: "other", label: "その他", Icon: MapPin },
];

/** 半径の範囲。狭すぎるとGPS誤差で誤検知する（企画書 §2.4）*/
const RADIUS_MIN = 50;
const RADIUS_MAX = 1000;

/**
 * SC-P02 場所登録・編集
 * 地図を動かして中央のピンで位置を決める。半径はスライダー。
 */
export default function PlaceEditPage() {
  const { id } = useParams(); // undefined なら新規作成
  const navigate = useNavigate();
  const isNight = useAppStore((state) => state.isNight);

  const isEdit = id !== undefined;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("home");
  const [radius, setRadius] = useState(200);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    let alive = true;
    fetchPlace(id).then((place) => {
      if (!alive) return;

      // ⚠️ 見つからなくても loading は必ず解除する。
      //   ここで return すると「読み込み中…」から永久に戻れない
      if (!place) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setName(place.name);
      setCategory(place.category);
      setRadius(place.radiusMeters);
      setCenter([place.lat, place.lng]);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [id, isEdit]);

  const handleSave = async () => {
    setBusy(true);

    const input = {
      name: name.trim(),
      category,
      radiusMeters: radius,
      lat: center[0],
      lng: center[1],
    };

    if (isEdit) {
      await updatePlace(id, input);
    } else {
      await createPlace(input);
    }

    navigate("/places", { replace: true });
  };

  const handleDelete = async () => {
    setBusy(true);
    await deletePlace(id);
    navigate("/places", { replace: true });
  };

  if (loading) {
    return (
      <div className="bg-canvas text-ink-sub flex h-svh items-center justify-center text-sm">
        読み込み中…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-canvas flex h-svh flex-col items-center justify-center gap-4 px-6">
        <p className="text-ink-sub text-center text-sm">
          この場所は見つかりませんでした
        </p>
        <button
          type="button"
          onClick={() => navigate("/places", { replace: true })}
          className="text-brand text-sm font-semibold"
        >
          場所一覧へ
        </button>
      </div>
    );
  }

  const color = placeColor(category);

  return (
    <div className="bg-canvas flex h-svh flex-col">
      {/* ===== ヘッダー ===== */}
      <header className="bg-surface border-line flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
        <button
          type="button"
          aria-label="戻る"
          onClick={() => navigate(-1)}
          className="text-ink flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-ink flex-1 text-center text-[15px] font-bold">
          {isEdit ? "場所を編集" : "場所を追加"}
        </h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={name.trim() === "" || busy}
          className="text-brand shrink-0 px-2 text-[15px] font-bold disabled:opacity-30"
        >
          {busy ? "保存中…" : "保存"}
        </button>
      </header>

      {/* ===== 地図。中央のピンで位置を決める ===== */}
      <div className="relative h-[42%] shrink-0">
        <MapContainer
          center={center}
          zoom={15}
          zoomControl={false}
          className="absolute inset-0 h-full w-full"
        >
          <TileLayer
            key={isNight ? "dark" : "light"}
            url={isNight ? TILE_DARK : TILE_LIGHT}
            attribution={TILE_ATTRIBUTION}
            subdomains={TILE_SUBDOMAINS}
            maxZoom={MAX_ZOOM}
          />

          {/* 設定中の範囲をその場で見せる */}
          <Circle
            center={center}
            radius={radius}
            pathOptions={{
              className: `mm-zone mm-zone--${category}`,
              fillOpacity: 0.12,
              weight: 2,
            }}
          />

          <CenterWatcher onMove={setCenter} />
        </MapContainer>

        {/* 中央固定のピン。⚠️ 地図の外に置く。中に入れるとドラッグを邪魔する */}
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <span
            className="block h-4 w-4 rounded-full border-4 border-white shadow-md"
            style={{ background: color }}
          />
        </div>

        <p className="bg-fab text-ink-sub absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full px-3 py-1 text-[11px] shadow">
          地図を動かして位置を合わせてください
        </p>
      </div>

      {/* ===== 入力 ===== */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <label htmlFor="place-name" className="text-ink-sub text-xs font-semibold">
          名前
        </label>
        <input
          id="place-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例: 自宅"
          className="bg-surface border-line text-ink placeholder:text-ink-muted mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[15px] outline-none"
        />

        <p className="text-ink-sub mt-5 text-xs font-semibold">種類</p>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {CATEGORIES.map((item) => {
            const selected = category === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 ${
                  selected ? "border-transparent" : "border-line bg-surface"
                }`}
                style={
                  selected
                    ? {
                        background: `color-mix(in srgb, ${placeColor(item.value)} 15%, transparent)`,
                        color: placeColor(item.value),
                      }
                    : undefined
                }
              >
                <item.Icon size={20} strokeWidth={2} />
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <label htmlFor="place-radius" className="text-ink-sub text-xs font-semibold">
            範囲
          </label>
          <span className="text-ink text-sm font-bold tabular-nums">
            {formatDistance(radius)}
          </span>
        </div>
        <input
          id="place-radius"
          type="range"
          min={RADIUS_MIN}
          max={RADIUS_MAX}
          step={10}
          value={radius}
          onChange={(event) => setRadius(Number(event.target.value))}
          className="accent-brand mt-2 w-full"
        />
        <p className="text-ink-muted mt-1 text-xs">
          狭くしすぎるとGPSの誤差で出入りを繰り返し、通知が増えます
        </p>

        {/* 住所はサーバーが逆ジオコーディングして返す。ここでは作らない */}
        <p className="text-ink-muted mt-5 text-xs">
          座標 {center[0].toFixed(5)}, {center[1].toFixed(5)}
        </p>

        {isEdit && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="border-line text-alert mt-6 flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 text-[15px] font-semibold disabled:opacity-40"
          >
            <Trash2 size={18} strokeWidth={2} />
            この場所を削除
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        busy={busy}
        destructive
        title={`「${name}」を削除しますか？`}
        message="この場所の到着・出発の通知が止まります。過去の履歴は残ります。"
        confirmLabel="削除する"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/**
 * 地図が動き終わるたびに、中央の座標を親へ渡す。
 *
 * useMapEvents は「MapContainer の中」でしか使えないので、
 * FitBounds と同じくこういう子コンポーネントにする。
 */
function CenterWatcher({ onMove }) {
  const map = useMapEvents({
    moveend: () => {
      const { lat, lng } = map.getCenter();
      onMove([lat, lng]);
    },
  });

  return null;
}
