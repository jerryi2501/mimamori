import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import { ArrowLeft, TriangleAlert, Navigation, Check, MapPin } from "lucide-react";
import {
  TILE_LIGHT,
  TILE_DARK,
  TILE_ATTRIBUTION,
  TILE_SUBDOMAINS,
  MAX_ZOOM,
} from "@/lib/mapConfig";
import { fetchSosAlert, fetchMembers, fetchMe, respondToSos } from "@/api";
import { formatLastUpdated } from "@/lib/format";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { createMemberIcon } from "@/components/map/memberIcon";
import { useAppStore } from "@/store";

/** 発信位置を囲む円の半径（メートル）。だいたいの場所を示すだけ */
const AREA_RADIUS = 120;

/**
 * SC-S02 SOS受信・詳細
 * 誰が・どこで・どれくらい前か。そして「向かっています」を返せる。
 */
export default function SosAlertPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNight = useAppStore((state) => state.isNight);
  const currentGroupId = useAppStore((state) => state.currentGroupId);

  const [alert, setAlert] = useState(null);
  const [members, setMembers] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    Promise.all([fetchSosAlert(id), fetchMembers(currentGroupId), fetchMe()]).then(
      ([foundAlert, foundMembers, foundMe]) => {
        if (!alive) return;
        setAlert(foundAlert);
        setMembers(foundMembers);
        setMe(foundMe);
        setLoading(false);
      }
    );

    return () => {
      alive = false;
    };
  }, [id, currentGroupId]);

  const handleRespond = async () => {
    setBusy(true);
    try {
      // サーバーが更新後の通報を返すので、手元で組み立て直さない
      setAlert(await respondToSos(id));
    } catch (caught) {
      setError(caught.message);
    } finally {
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

  // ⚠️ 行き止まりにしない。リロード後は手元の SOS が消えているのでここに来る
  if (!alert) {
    return (
      <div className="bg-canvas flex h-svh flex-col items-center justify-center gap-4 px-6">
        <p className="text-ink-sub text-center text-sm">
          この通報は見つかりませんでした
        </p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="text-brand text-sm font-semibold"
        >
          マップへ
        </button>
      </div>
    );
  }

  // ⚠️ 自分が発信した SOS もこの画面で開ける。
  //   members には自分も含まれるが、念のため me も候補に混ぜる
  const isMine = alert.userId === me?.id;
  const sender =
    members.find((member) => member.id === alert.userId) ?? (isMine ? me : null);
  const position = [alert.lat, alert.lng];

  const isResolved = alert.status === "RESOLVED";
  const iAmGoing = alert.responderIds.includes(me?.id);

  // ⚠️ 自分を外す。members に自分が含まれるので、外さないと下の一覧と
  //   「あなた」の枠に二重で出る
  const responders = members.filter(
    (member) => member.id !== me?.id && alert.responderIds.includes(member.id)
  );

  // ⚠️ /api/me は座標を返さないので、たいてい「不明」になる。
  //   NaN を formatDistance に渡すと画面に「NaNkm」と出るため必ず確認する
  const distance =
    me?.lat != null && me?.lng != null
      ? distanceMeters(me, { lat: alert.lat, lng: alert.lng })
      : null;

  /** 地図ピン用。MOCK_ME には電池や共有状態が無いので補う */
  const senderPin = sender && {
    ...sender,
    shareLocation: sender.shareLocation ?? true,
    batteryLevel: sender.batteryLevel ?? null,
  };

  /**
   * 端末の地図アプリで経路を開く。
   * ※ 地図の描画は CARTO だが、経路案内は外部に任せる（企画書 §2.4 の割り切り）
   */
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${alert.lat},${alert.lng}`;

  return (
    <div className="bg-canvas flex h-svh flex-col">
      {/* ===== 見出し。解除済みかどうかで色が変わる ===== */}
      <header
        className={`shrink-0 px-4 pt-3 pb-4 text-white ${
          isResolved ? "bg-safe" : "bg-alert"
        }`}
      >
        <button
          type="button"
          aria-label="戻る"
          onClick={() => navigate(-1)}
          className="mb-1 flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        <div className="flex items-start gap-2.5 px-1">
          {isResolved ? (
            <Check size={26} strokeWidth={2.5} className="mt-0.5 shrink-0" />
          ) : (
            <TriangleAlert size={26} strokeWidth={2.5} className="mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold">
              {isResolved
                ? "解除されました"
                : isMine
                  ? "あなたが緊急通報しました"
                  : `${sender?.name ?? "メンバー"}さんが助けを求めています`}
            </h1>
            <p className="mt-1 text-sm opacity-90">
              {formatLastUpdated(alert.triggeredAt)}
              {distance != null && ` ・ ここから ${formatDistance(distance)}`}
            </p>
          </div>
        </div>
      </header>

      {/* ===== 地図 ===== */}
      <div className="relative h-[38%] shrink-0">
        <MapContainer
          center={position}
          zoom={16}
          zoomControl={false}
          scrollWheelZoom={false}
          className="absolute inset-0 h-full w-full"
        >
          <TileLayer
            key={isNight ? "dark" : "light"}
            url={isNight ? TILE_DARK : TILE_LIGHT}
            attribution={TILE_ATTRIBUTION}
            subdomains={TILE_SUBDOMAINS}
            maxZoom={MAX_ZOOM}
          />
          {!isResolved && (
            <Circle
              center={position}
              radius={AREA_RADIUS}
              pathOptions={{ className: "mm-alert-area", fillOpacity: 0.15, weight: 2 }}
            />
          )}
          {senderPin && (
            <Marker position={position} icon={createMemberIcon(senderPin)} />
          )}
        </MapContainer>
      </div>

      {/* ===== 詳細 ===== */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="text-ink flex items-center gap-1.5 text-sm">
          <MapPin size={15} strokeWidth={2} className="text-ink-sub shrink-0" />
          {sender?.address ?? "住所を取得できません"}
        </p>

        {/* 誰が向かっているか。重複して駆けつけるのを防ぐ */}
        <h2 className="text-ink-sub mt-5 text-xs font-semibold">向かっている人</h2>
        {responders.length === 0 && !iAmGoing ? (
          <p className="text-ink-muted mt-1.5 text-sm">まだ誰も応答していません</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-3">
            {iAmGoing && (
              <li className="flex w-14 flex-col items-center">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ background: me?.color }}
                >
                  {me?.initial}
                </span>
                <span className="text-ink-sub mt-1 text-[11px]">あなた</span>
              </li>
            )}
            {responders.map((member) => (
              <li key={member.id} className="flex w-14 flex-col items-center">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ background: member.color }}
                >
                  {member.initial}
                </span>
                <span className="text-ink-sub mt-1 truncate text-[11px]">
                  {member.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== 行動 ===== */}
      {/* 自分の通報には「向かう」意味がないので出さない */}
      {!isResolved && !isMine && (
        <div className="border-line shrink-0 space-y-2 border-t px-4 py-4">
          {error && (
            <p role="alert" className="text-alert text-center text-xs">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy || iAmGoing}
            onClick={handleRespond}
            className="bg-alert flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white disabled:opacity-40"
          >
            <Check size={18} strokeWidth={2.5} />
            {iAmGoing ? "向かっています" : "向かいます"}
          </button>

          {/* 経路案内だけは外部の地図アプリに任せる */}
          <a
            href={routeUrl}
            target="_blank"
            rel="noreferrer"
            className="border-line text-ink flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 text-[15px] font-semibold"
          >
            <Navigation size={18} strokeWidth={2} />
            経路を見る
          </a>
        </div>
      )}
    </div>
  );
}
