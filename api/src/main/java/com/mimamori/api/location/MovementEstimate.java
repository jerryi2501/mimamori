package com.mimamori.api.location;

import com.mimamori.api.common.GeoUtils;
import java.time.Duration;

/** 直近2点から「今どう動いているか」を推定した結果。 */
public record MovementEstimate(Movement movement, Integer speedKmh) {

    /** これより短い間隔の2点からは速度を出さない。GPS の誤差のほうが大きくなる */
    private static final Duration MIN_GAP = Duration.ofSeconds(5);

    /** これ以上間が空いた2点は、間に何があったか分からないので速度を出さない */
    private static final Duration MAX_GAP = Duration.ofMinutes(15);

    private static final MovementEstimate STILL = new MovementEstimate(Movement.STILL, null);

    public static MovementEstimate of(Location previous, Location latest) {
        if (previous == null || latest == null) {
            return STILL;
        }

        Duration gap = Duration.between(previous.getRecordedAt(), latest.getRecordedAt());

        // ⚠️ MIN_GAP との比較が「0秒」「負の値」「ミリ秒だけの差」をまとめて弾く。
        //    isZero() だけでは足りない: 31ミリ秒差は「0秒ではない」のに
        //    toSeconds() は 0 を返し、0除算で Infinity になる。その後
        //    Math.round が Long.MAX_VALUE を返し、int にすると -1 になって
        //    画面に「-1km/h」と出る
        if (gap.compareTo(MIN_GAP) < 0 || gap.compareTo(MAX_GAP) > 0) {
            return STILL;
        }

        double meters =
                GeoUtils.distanceMeters(
                        previous.getLat(), previous.getLng(), latest.getLat(), latest.getLng());

        // ⚠️ toSeconds() ではなく toMillis()。秒に丸めると短い間隔で精度が落ちる
        double speedKmh = (meters / 1000.0) / (gap.toMillis() / 3_600_000.0);
        Movement movement = Movement.of(speedKmh);

        // 止まっているときは速度を出さない（画面が「0km/h」と出すのを防ぐ）
        return movement == Movement.STILL
                ? STILL
                : new MovementEstimate(movement, (int) Math.round(speedKmh));
    }
}
