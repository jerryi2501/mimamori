import { useEffect, useRef } from "react";
import { sendLocation } from "@/api";
import { distanceMeters } from "@/lib/geo";
import { reverseGeocode } from "@/lib/geocode";
import { GEOCODE_MIN_MOVE_M, PING_INTERVAL_NORMAL } from "@/lib/mapConfig";
import { useAppStore } from "@/store";

/**
 * 電池残量（%）。取れなければ null。
 *
 * ⚠️ Firefox / Safari は navigator.getBattery() を廃止した（企画書 §2.4）。
 *   無い前提で書く。null はサーバーと画面で「不明」として扱われる。
 */
async function readBatteryLevel() {
  if (!navigator.getBattery) return null;

  try {
    const battery = await navigator.getBattery();
    return Math.round(battery.level * 100);
  } catch {
    return null;
  }
}

/**
 * 自分の現在地を見張り、サーバーへ送り続ける（F-01）。
 *
 * RequireAuth から1回だけ呼ぶ。ログイン中のどの画面にいても動き続け、
 * 送った位置は WebSocket で家族の地図に届く。
 *
 * ⚠️ ブラウザはタブが開いている間しか位置を取れない（CLAUDE.md）。
 *   バックグラウンド追跡はできないので、画面は必ず更新時刻を出すこと。
 */
export default function useMyLocation() {
  const token = useAppStore((state) => state.token);
  const setMyPosition = useAppStore((state) => state.setMyPosition);
  const setLocationError = useAppStore((state) => state.setLocationError);

  // ⚠️ state ではなく ref。書き換えても描き直す必要が無いし、state にすると
  //   値が変わるたびに監視を張り直すことになる。
  const lastSentAt = useRef(0);
  const lastGeocoded = useRef(null);

  useEffect(() => {
    if (!token) return;

    if (!navigator.geolocation) {
      setLocationError("この端末では位置情報を利用できません");
      return;
    }

    // ⚠️ 位置情報は HTTPS か localhost でしか使えない（secure context）。
    //   IP アドレスに http でつなぐ開発中がこれに当たる。
    //
    //   このときブラウザは PERMISSION_DENIED を返すので、そのままだと
    //   「ブラウザの設定から許可してください」と出てしまうが、設定を
    //   触っても直らない。利用者に落ち度が無いので帯は出さず、
    //   開発者にだけ分かるようコンソールに残す。
    //   本番（Vercel）は HTTPS なのでここは通らない。
    if (!window.isSecureContext) {
      console.warn(
        "位置情報は HTTPS か localhost でのみ利用できます。" +
          "現在の接続元: " +
          window.location.origin
      );
      return;
    }

    // 画面から離れたあとに届いた結果を捨てるための印
    let alive = true;

    /**
     * 住所は約100m以上動いたときだけ引く（デザインガイドライン §7）。
     * 動いていなければ undefined を返し、サーバーに前回の住所を使わせる。
     */
    const addressIfMoved = async (lat, lng) => {
      const previous = lastGeocoded.current;

      if (previous && distanceMeters(previous, { lat, lng }) < GEOCODE_MIN_MOVE_M) {
        return undefined;
      }

      const address = await reverseGeocode(lat, lng);
      // ⚠️ 取れなかった地点は覚えない。覚えると、そこから動かない限り
      //   二度と住所を引き直さなくなる
      if (address) lastGeocoded.current = { lat, lng, address };

      return address ?? undefined;
    };

    const handlePosition = async (position) => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords;

      // ⚠️ watchPosition は歩いているだけで秒に何度も呼ばれる。間隔をあけないと
      //   30秒に1度のはずの送信が、そのまま連打になる（企画書 §6）
      const now = Date.now();
      if (now - lastSentAt.current < PING_INTERVAL_NORMAL) return;
      lastSentAt.current = now;

      const address = await addressIfMoved(lat, lng);
      if (!alive) return;

      // ⚠️ 送信より先に手元へ反映する。距離の表示（SC-M02）と SOS の発信は
      //   サーバーの応答を待つ理由が無い。通信が失敗しても現在地は現在地。
      setMyPosition({
        lat,
        lng,
        accuracy,
        address: address ?? lastGeocoded.current?.address ?? null,
        at: now,
      });
      setLocationError(null);

      try {
        await sendLocation({
          lat,
          lng,
          // ⚠️ 端末は 13.456789 のような値を返す。1m 未満は使い道が無い
          accuracy: Math.round(accuracy),
          batteryLevel: await readBatteryLevel(),
          address,
        });
      } catch {
        // ⚠️ 握りつぶす。次の周期でやり直せるし、地図が見られなくなる
        //   わけでもないのに画面へエラーを出すと邪魔になるだけ
      }
    };

    const handleError = (error) => {
      // ⚠️ 拒否されたときだけ止める。GPS を一時的に掴めないだけなら
      //   watchPosition は自力で復帰するので、監視を切ってはいけない
      if (error.code === error.PERMISSION_DENIED) {
        setLocationError(
          "位置情報の利用が許可されていません。ブラウザの設定から許可してください"
        );
        navigator.geolocation.clearWatch(watchId);
      }
    };

    const watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      // ⚠️ 送信間隔より長いキャッシュを許すと、送る値が常に古くなる
      maximumAge: 15_000,
      timeout: 20_000,
    });

    return () => {
      alive = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [token, setMyPosition, setLocationError]);
}
