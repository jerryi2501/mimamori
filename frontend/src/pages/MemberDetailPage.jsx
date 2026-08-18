import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import {
  ArrowLeft,
  Bell,
  History,
  Navigation,
  MessageCircle,
  Footprints,
  Bike,
  Car,
  MapPin,
  Clock,
  MoreVertical,
  BatteryMedium,
  Share2,
  CalendarDays,
} from "lucide-react";
import {
  TILE_LIGHT,
  TILE_DARK,
  TILE_ATTRIBUTION,
  TILE_SUBDOMAINS,
  MAX_ZOOM,
} from "@/lib/mapConfig";
import {
  fetchMember,
  sendPing,
  fetchLatestPing,
  removeGroupMember,
  fetchGroup,
} from "@/api";
import {
  formatLastUpdated,
  movementLabel,
  formatTime,
  batteryColor,
  formatDayLabel,
} from "@/lib/format";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { createMemberIcon } from "@/components/map/memberIcon";
import { useAppStore } from "@/store";
import { subscribe } from "@/lib/realtime";
import ConfirmDialog from "@/components/common/ConfirmDialog";

/**
 * 移動手段ごとのアイコン。※キーの値は大文字始まりにすること（JSXの決まり）
 *
 * ⚠️ vehicle に車のアイコンを使うが、文言は「乗り物」。電車もバスも含むので、
 *   絵は代表として車を借りているだけ。言い切るのは文言のほうに任せる。
 */
const MOVEMENT_ICON = { walk: Footprints, bike: Bike, vehicle: Car };

/** 呼び出しの状態ごとの見た目（企画書 §2.3）*/
const PING_VIEW = {
  SENT: {
    title: "呼び出しました",
    note: "応答を待っています…（3分で「応答なし」になります）",
    box: "bg-warn/10 border-warn/30",
  },
  OK: {
    title: "応答あり",
    note: "「大丈夫だよ」と返事がありました",
    box: "bg-safe/10 border-safe/30",
  },
  LATER: {
    title: "あとで返すと言っています",
    note: "音は止まりましたが、まだ返事はもらえていません",
    box: "bg-brand-soft border-line",
  },
  NO_RESPONSE: {
    title: "応答がありません",
    note: "3分経っても返事がありません。最後の位置を確認してください",
    box: "bg-alert/10 border-alert/30",
  },
};

/**
 * SC-M02 メンバー詳細
 * 上45%が地図、下55%がシート。マップ画面のピン／一覧から遷移する。
 */
export default function MemberDetailPage() {
  const { id } = useParams(); // ⚠️ 文字列で来る
  const navigate = useNavigate();
  const isNight = useAppStore((state) => state.isNight);
  const currentGroupId = useAppStore((state) => state.currentGroupId);

  // ⚠️ 距離は「自分が今どこに居るか」が要る。/api/me は座標を返さないので、
  //   端末から取った現在地（useMyLocation が入れる）を見る
  const myPosition = useAppStore((state) => state.myPosition);

  // ⚠️ 「グループから削除」は OWNER だけができる（GroupService.remove）。
  //   役割を見ずにボタンを出すと、押せば必ず 403 になる場所を見せることになる。
  const user = useAppStore((state) => state.user);

  const [myRole, setMyRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(true);
  const [ping, setPing] = useState(null); // 送信した呼び出し
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  const handlePing = async () => {
    const created = await sendPing(member.id);
    setPing(created);
  };

  /**
   * 端末の地図アプリで、この人までの経路を開く。
   *
   * ※ 地図の描画は CARTO だが、経路案内は外部に任せる（企画書 §2.4 の割り切り）。
   *   SosAlertPage と同じやり方。
   *
   * ⚠️ 新しいタブで開き、noopener を付ける。付けないと開いた先から
   *   window.opener でこちらのページを操作できてしまう。
   */
  const openRoute = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${member.lat},${member.lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /** グループから外す。⚠️ 取り消せないので必ず確認を挟む */
  const handleRemove = async () => {
    setBusy(true);
    await removeGroupMember(currentGroupId, member.id);
    navigate(-1); // 一覧に戻る。この人はもう表示されない
  };

  useEffect(() => {
    let alive = true; // 取得中に別の人へ遷移したとき、古い結果を捨てるための印

    setLoading(true);
    // 3つの取得は互いに独立なので、並行して待つ。
    // ⚠️ fetchGroup が返す role は「このAPIを呼んだ人の役割」であって
    //   グループの属性ではない（GroupResponse の注記）。
    Promise.all([
      fetchMember(currentGroupId, id),
      fetchLatestPing(id),
      fetchGroup(currentGroupId),
    ]).then(([foundMember, foundPing, group]) => {
      if (!alive) return;
      setMember(foundMember);
      setPing(foundPing);
      setSharing(foundMember?.shareLocation ?? false);
      setMyRole(group?.role ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [id, currentGroupId]);

  // ⭐ リアルタイム（F-11）。相手が「大丈夫だよ」を押した瞬間、または3分経って
  //   「応答なし」になった瞬間に、この画面の帯が変わる。
  //   ⚠️ 宛先は自分あての /user/queue/ping。呼び出しの結果は呼んだ本人にしか届かない
  useEffect(() => {
    return subscribe("/user/queue/ping", (incoming) => {
      // 同じ相手あてに自分が送ったものだけを反映する
      if (incoming.toUserId === Number(id)) {
        setPing(incoming);
      }
    });
  }, [id]);

  if (loading) {
    return <CenterMessage text="読み込み中…" />;
  }
  if (!member) {
    // ⚠️ 行き止まりにしない。削除済み・URL直打ちでここに来る
    return (
      <CenterMessage
        text="このメンバーは見つかりませんでした"
        actionLabel="マップへ"
        onAction={() => navigate("/", { replace: true })}
      />
    );
  }

  const isOff = !member.shareLocation;

  // ⚠️ 共有オフ・位置未送信だと座標が来ない。地図を描かせない
  const hasPosition = member.lat != null && member.lng != null;
  const position = hasPosition ? [member.lat, member.lng] : null;

  // ⚠️ 自分の座標がまだ無いと NaN になり、画面に「NaNkm」と出る。
  //   位置情報を拒否された端末では最後まで来ないので、必ず確認する
  const canMeasure = hasPosition && myPosition != null;
  const distance = canMeasure ? distanceMeters(myPosition, member) : null;

  const moveLabel = movementLabel(member.movement);
  const MoveIcon = MOVEMENT_ICON[member.movement];

  // ⚠️ 自分自身も外せない。OWNER が抜けるのは「グループを削除」であって
  //   メンバーの削除ではない（GroupService の分岐と合わせる）。
  const canRemove = myRole === "OWNER" && member.id !== user?.id;

  return (
    <div className="bg-canvas flex h-svh flex-col">
      {/* ===== 上: 地図 ===== */}
      <div className="bg-subtle relative h-[45%] shrink-0">
        {hasPosition ? (
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
            <Marker position={position} icon={createMemberIcon(member)} />
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <p className="text-ink-sub text-center text-sm">
              {isOff
                ? "この人は位置の共有をオフにしています"
                : "まだ位置が送られていません"}
            </p>
          </div>
        )}

        {/* 戻るボタン。⚠️ MapContainer の外に置くこと */}
        <button
          type="button"
          aria-label="戻る"
          onClick={() => navigate(-1)}
          className="bg-fab border-fab-line text-ink shadow-float absolute top-4 left-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        {/* 取り消せない操作は「⋯」の中に隠す。よく開く画面の一番下に
            赤い大ボタンを置くと、誤爆の危険が高いわりに使う頻度は低い。
            ⚠️ OWNER 以外には出さない。押せば必ず 403 になる場所を
            見せないこと（GroupDetailPage と同じ方針）。 */}
        {canRemove && (
          <>
            <button
              type="button"
              aria-label="その他の操作"
              onClick={() => setMenuOpen((open) => !open)}
              className="bg-fab border-fab-line text-ink shadow-float absolute top-4 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md"
            >
              <MoreVertical size={20} strokeWidth={2} />
            </button>

            {menuOpen && (
              <>
                {/* 外側を押したら閉じる受け皿。メニューより下に敷く */}
                <button
                  type="button"
                  aria-label="メニューを閉じる"
                  onClick={() => setMenuOpen(false)}
                  className="absolute inset-0 z-[1000] cursor-default"
                />
                <div className="bg-surface shadow-float absolute top-16 right-4 z-[1001] overflow-hidden rounded-xl">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmRemove(true);
                    }}
                    className="text-alert w-full px-5 py-3 text-left text-sm font-semibold whitespace-nowrap disabled:opacity-40"
                  >
                    グループから削除
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ===== 下: シート ===== */}
      <section className="bg-surface shadow-sheet relative z-[1000] -mt-4 flex min-h-0 flex-1 flex-col rounded-t-2xl">
        <div className="flex justify-center py-2">
          <div className="bg-line h-1 w-9 rounded-full" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
          {/* --- 見出し --- */}
          <div className="flex flex-col items-center pt-2 pb-6">
            <div
              className={`mb-3 flex h-18 w-18 items-center justify-center rounded-full text-2xl font-bold text-white ${
                isOff ? "opacity-70 grayscale" : ""
              }`}
              style={{ background: member.color }}
            >
              {member.initial}
            </div>

            <h1 className="text-ink mb-1 text-xl font-bold">{member.name}</h1>

            {/* 住所がなければ出さない。※でっち上げないこと（設計ルール）*/}
            <p className="text-ink-sub mb-2 text-[13px]">
              {isOff ? "共有オフ" : (member.address ?? "住所を取得できません")}
            </p>

            {!isOff && (
              <div className="text-ink-sub flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <MapPin size={13} strokeWidth={2} />
                  {formatDistance(distance)}
                </span>
                <span>・</span>
                <span className="flex items-center gap-1">
                  <Clock size={13} strokeWidth={2} />
                  {formatLastUpdated(member.lastUpdatedAt)}
                </span>
                {moveLabel && (
                  <>
                    <span>・</span>
                    <span className="flex items-center gap-1">
                      <MoveIcon size={13} strokeWidth={2} />
                      {moveLabel}
                      {member.speedKmh != null && ` ${member.speedKmh}km/h`}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <hr className="border-line mb-6" />

          {/* --- 4つのアクション --- */}
          <div className="mb-6 grid grid-cols-4 gap-2">
            <ActionButton label="呼び出し" Icon={Bell} onClick={handlePing} />
            <ActionButton
              label="履歴"
              Icon={History}
              onClick={() => navigate(`/history/${member.id}`)}
            />

            <ActionButton
              label="経路"
              Icon={Navigation}
              disabled={!hasPosition}
              onClick={openRoute}
            />
            <ActionButton
              label="メッセージ"
              Icon={MessageCircle}
              onClick={() => navigate(`/chat/direct-${member.id}`)}
            />
          </div>

          {/* 呼び出しの状態（F-11）*/}
          {ping && <PingStatus ping={ping} onRetry={handlePing} navigate={navigate} />}

          <hr className="border-line mb-5" />

          {/* --- 端末とグループの状態 ---
              ⚠️ 共有はここでは切り替えられない。DB の share_location は「自分が
              そのグループで共有するか」であって、「相手ごと」の設定は存在しない
              （企画書 F-03）。自分の共有を切り替えるのは設定画面（SC-T01）。 */}
          <dl className="bg-subtle mb-4 rounded-xl px-4 py-1">
            <InfoRow Icon={BatteryMedium} label="電池残量">
              {/* ⚠️ level != null で判定する。{level && …} だと 0% が
                  そのまま画面に出る（設計ルール） */}
              {member.batteryLevel != null ? (
                <span style={{ color: batteryColor(member.batteryLevel) }}>
                  {member.batteryLevel}%
                </span>
              ) : (
                <span className="text-ink-muted">不明</span>
              )}
            </InfoRow>

            <InfoRow Icon={Share2} label="位置共有">
              <span className={sharing ? "text-safe" : "text-idle"}>
                {sharing ? "オン" : "オフ"}
              </span>
            </InfoRow>

            <InfoRow Icon={CalendarDays} label="参加日" last>
              {member.joinedAt ? (
                formatDayLabel(new Date(member.joinedAt))
              ) : (
                <span className="text-ink-muted">不明</span>
              )}
            </InfoRow>
          </dl>

          <p className="text-ink-sub mb-2 text-xs">
            相手が共有をオフにしている間は、位置も電池残量も届きません
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={confirmRemove}
        busy={busy}
        destructive
        title={`${member.name}さんをグループから外しますか？`}
        message="お互いの位置が見えなくなります。招待コードを渡せば、あとで参加し直してもらえます。"
        confirmLabel="外す"
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}

/** 読み込み中・エラー時の中央表示 */
function CenterMessage({ text, actionLabel, onAction }) {
  return (
    <div className="bg-canvas flex h-svh flex-col items-center justify-center gap-4 px-6">
      <p className="text-ink-sub text-center text-sm">{text}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-brand text-sm font-semibold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * 4つ並ぶ角丸ボタン。
 *
 * ⚠️ disabled を受けられるようにしてある。共有オフや位置未送信のときに
 *   「経路」を押せてしまうと、行き先の無い地図アプリが開く。
 */
function ActionButton({ label, Icon, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 disabled:opacity-40"
    >
      <span className="bg-subtle text-brand flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon size={22} strokeWidth={2} />
      </span>
      <span className="text-ink text-xs font-semibold">{label}</span>
    </button>
  );
}

/**
 * 端末情報カードの1行。
 *
 * ⚠️ アイコンは配列やpropで渡すとき大文字始まりにすること。JSX は小文字を
 *   HTMLタグとして扱うため、icon だと <icon> になって何も描かれない。
 */
function InfoRow({ Icon, label, last, children }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        last ? "" : "border-line border-b"
      }`}
    >
      <dt className="text-ink-sub flex items-center gap-2 text-[13px]">
        <Icon size={15} strokeWidth={2} />
        {label}
      </dt>
      <dd className="text-ink text-sm font-semibold">{children}</dd>
    </div>
  );
}

/** 呼び出しの結果を出す帯。状態で色と文言が変わる */
function PingStatus({ ping, onRetry, navigate }) {
  const view = PING_VIEW[ping.status];
  if (!view) return null;

  return (
    <div className={`mb-6 rounded-xl border p-3 ${view.box}`}>
      <p className="text-ink text-sm font-semibold">
        {view.title}
        {ping.respondedAt && (
          <span className="text-ink-sub ml-1.5 text-xs font-normal">
            {formatTime(ping.respondedAt)}
          </span>
        )}
      </p>
      <p className="text-ink-sub mt-0.5 text-xs">{view.note}</p>

      {/* 応答待ちの間だけ、相手の画面を確認できるようにする */}
      {ping.status === "SENT" && (
        <button
          type="button"
          onClick={() => navigate(`/ping/${ping.id}`)}
          className="text-brand mt-2 text-xs font-semibold underline"
        >
          デモ: 受信側の画面を見る
        </button>
      )}

      {ping.status === "NO_RESPONSE" && (
        <button
          type="button"
          onClick={onRetry}
          className="text-brand mt-2 text-xs font-semibold underline"
        >
          もう一度呼び出す
        </button>
      )}
    </div>
  );
}
