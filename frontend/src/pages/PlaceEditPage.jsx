import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Circle, useMapEvents, useMap } from "react-leaflet";
import {
  ArrowLeft,
  House,
  School,
  Briefcase,
  MapPin,
  Trash2,
  Search,
  LocateFixed,
  Loader2,
  X,
} from "lucide-react";
import { searchPlaces } from "@/lib/geocode";
import {
  TILE_LIGHT,
  TILE_DARK,
  TILE_ATTRIBUTION,
  MAX_ZOOM,
  DEFAULT_CENTER,
} from "@/lib/mapConfig";
import { fetchPlace, createPlace, updatePlace, deletePlace } from "@/api";
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
 * 打ち終わってから検索するまでの待ち時間。
 *
 * ⚠️ 一文字ごとに投げない。提供元は無料の公共サービスで、
 *   礼儀としても実用としても、押しっぱなしで叩く相手ではない。
 */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * 検索を始める最小の文字数。
 *
 * ⚠️ 一文字では投げない。日本語入力では変換前のかなが一度は一文字に
 *   なるが、地理院に「く」を渡すと全国から61,512件、10MBが返ってくる。
 *   携帯の回線では致命的で、しかもその結果は誰の役にも立たない。
 *   二文字あれば「くじ」で0.56MB、「くじょう」で0.26MBまで下がる。
 */
const MIN_QUERY_LENGTH = 2;

/**
 * SC-P02 場所登録・編集
 * 地図を動かして中央のピンで位置を決める。半径はスライダー。
 */
export default function PlaceEditPage() {
  const { id } = useParams(); // undefined なら新規作成
  const navigate = useNavigate();
  const isNight = useAppStore((state) => state.isNight);
  const currentGroupId = useAppStore((state) => state.currentGroupId);

  const isEdit = id !== undefined;

  // ⚠️ 新規登録は自分の現在地から始める。地図の既定値（大阪）から始めると、
  //   東京に住む人は日本を横断するぶん指でずらす羽目になる。
  const myPosition = useAppStore((state) => state.myPosition);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("home");
  const [radius, setRadius] = useState(200);
  const [center, setCenter] = useState(
    myPosition ? [myPosition.lat, myPosition.lng] : DEFAULT_CENTER
  );
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ---- 場所の検索 ----
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null=未検索, []=該当なし
  const [searching, setSearching] = useState(false);

  /**
   * 並び順の基準にする地点＝地図の中心。
   *
   * ⚠️ center をそのまま useEffect の依存に入れてはいけない。指で少し
   *   動かすたびに検索がやり直される。読みたいのは「今どこか」だけ。
   */
  const centerRef = useRef(center);
  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  /** 候補を選んだ直後の setQuery で、同じ検索が走り候補が開き直すのを防ぐ */
  const skipNextSearch = useRef(false);

  /**
   * 地図を飛ばす先。設定すると MapMover が一度だけ動かす。
   *
   * ⚠️ center とは別に持つ。center は地図を動かすたびに書き変わるので、
   *   これを直接見て setView すると、指で動かした先へ引き戻されてしまう。
   */
  const [flyTo, setFlyTo] = useState(null);

  /** 打っている間に候補を出す。押し直しを待たせない */
  useEffect(() => {
    // 選んだ直後は、その名前でもう一度検索しない
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    // ⚠️ 変換前のかなでも引ける（「くじょうえき」→ 九条駅）。だから
    //   変換の確定を待たずに出す。ただし一文字だけは投げない
    const keyword = query.trim();
    if (keyword.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      const [lat, lng] = centerRef.current;
      const found = await searchPlaces(keyword, {
        near: { lat, lng },
        signal: controller.signal,
      });

      // ⚠️ 打ち直しで捨てられた検索。遅れて戻ってきた古い結果で
      //   今の候補を上書きしない
      if (controller.signal.aborted) return;

      setResults(found);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    // 次の一文字が来たら、待ち時間も通信も破棄する
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const pick = (place) => {
    setFlyTo([place.lat, place.lng]);
    setResults(null);

    // ⚠️ 同じ文字列なら state は変わらず useEffect も動かない。
    //   ここで旗を立てると、次に打った一文字が食べられてしまう
    if (place.title !== query) skipNextSearch.current = true;
    setQuery(place.title);
  };

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
    setError(null);

    const input = {
      name: name.trim(),
      category,
      radiusMeters: radius,
      lat: center[0],
      lng: center[1],
    };

    // ⚠️ 失敗を握りつぶさない。半径や名前の長さはサーバーも検証していて、
    //   catch が無いと「保存を押しても何も起きない」画面になる
    try {
      if (isEdit) {
        await updatePlace(id, input);
      } else {
        await createPlace(currentGroupId, input);
      }
      navigate("/places", { replace: true });
    } catch (caught) {
      setError(caught.message);
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);

    try {
      await deletePlace(id);
      navigate("/places", { replace: true });
    } catch (caught) {
      setError(caught.message);
      setConfirmDelete(false);
      setBusy(false);
    }
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
            className={isNight ? "mm-tiles-dark" : undefined}
            attribution={TILE_ATTRIBUTION}
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
          <MapMover target={flyTo} onDone={() => setFlyTo(null)} />
        </MapContainer>

        {/* ===== 場所を探す。⚠️ 地図の外に置く（中だとドラッグを奪う）
               ⚠️ z は地図に乗せる他のUIより1つ上。同じ z-[1000] だと、
                  あとから描かれる「現在地へ」ボタンが候補の距離を隠す ===== */}
        <div className="absolute inset-x-3 top-3 z-[1001]">
          <div className="relative">
            <Search
              size={17}
              strokeWidth={2}
              className="text-ink-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="住所や場所名で検索（例: 九条駅）"
              className="bg-fab text-ink border-fab-line placeholder:text-ink-muted shadow-float w-full rounded-full border py-2.5 pr-10 pl-10 text-sm backdrop-blur-md"
            />

            {/* 探している最中と、消せることを同じ場所で示す */}
            {searching ? (
              <Loader2
                size={16}
                strokeWidth={2.2}
                className="text-ink-muted absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin"
              />
            ) : (
              query !== "" && (
                <button
                  type="button"
                  aria-label="検索語を消す"
                  onClick={() => setQuery("")}
                  className="text-ink-muted absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              )
            )}
          </div>

          {/* 候補。⚠️ 高さを抑えて中でスクロールさせる。8件出ることがあり、
                 そのまま並べると地図の外へはみ出し、名前欄と種類ボタンを覆う */}
          {results != null && (
            <div className="bg-surface shadow-float mt-2 max-h-52 overflow-y-auto rounded-xl">
              {results.length === 0 ? (
                <p className="text-ink-sub px-4 py-3 text-sm">
                  見つかりませんでした。地図を動かして合わせることもできます
                </p>
              ) : (
                results.map((place) => (
                  <button
                    key={`${place.title}@${place.lat},${place.lng}`}
                    type="button"
                    onClick={() => pick(place)}
                    className="border-line flex w-full items-center gap-3 border-b px-4 py-2.5 text-left last:border-b-0"
                  >
                    {/* ⚠️ min-w-0 が無いと truncate が効かず、長い住所で行が伸びる */}
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-sm">
                        {place.title}
                      </span>
                      {place.subtitle !== "" && (
                        <span className="text-ink-muted block truncate text-xs">
                          {place.subtitle}
                        </span>
                      )}
                    </span>

                    {/* ⚠️ 同名の駅や店が並ぶ。距離だけが見分ける手がかりになる */}
                    {place.distance != null && (
                      <span className="text-ink-muted shrink-0 text-xs tabular-nums">
                        {formatDistance(place.distance)}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 自分の現在地へ戻す。⚠️ 位置が取れていないときは出さない */}
        {myPosition && (
          <button
            type="button"
            aria-label="現在地へ"
            onClick={() => setFlyTo([myPosition.lat, myPosition.lng])}
            className="bg-fab border-fab-line text-ink shadow-float absolute right-3 bottom-12 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md"
          >
            <LocateFixed size={19} strokeWidth={2} />
          </button>
        )}

        {/* 中央固定のピン。⚠️ 地図の外に置く。中に入れるとドラッグを邪魔する */}
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <span
            className="block h-4 w-4 rounded-full border-4 border-white shadow-md"
            style={{ background: color }}
          />
        </div>

        {/* ⚠️ 候補を出している間は引っ込める。候補一覧と同じ z-[1000] で、
               あとから描かれるこちらが上に乗り、市区町村と距離を隠す */}
        {results == null && (
          <p className="bg-fab text-ink-sub absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full px-3 py-1 text-[11px] shadow">
            地図を動かして位置を合わせてください
          </p>
        )}
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

        {/* サーバーが断った理由をそのまま出す */}
        {error && (
          <p role="alert" className="text-alert mt-4 text-xs">
            {error}
          </p>
        )}

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
 * 住所検索や「現在地へ」で決まった地点へ地図を動かす。
 *
 * ⚠️ target を消費したら onDone で親に知らせ、null に戻してもらう。
 *   残したままだと、そのあと指で地図を動かすたびに元の地点へ引き戻される。
 *
 * ⚠️ 動かすのは地図だけでよい。moveend が起きて CenterWatcher が
 *   中央の座標を拾うので、保存される位置は自動的に追随する。
 */
function MapMover({ target, onDone }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;

    map.setView(target, Math.max(map.getZoom(), 16));
    onDone();
  }, [target, map, onDone]);

  return null;
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
