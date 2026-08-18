package com.mimamori.api.location;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 移動手段の推定。
 *
 * <p>⚠️ GroupRole と違い、JSON では小文字で返す。frontend の movementLabel() が movement === "walk" で比較しているため。
 * enum 名は Java の慣習どおり大文字のままにし、 @JsonValue で出力だけを変える。
 */
public enum Movement {
    STILL("still"),
    WALK("walk"),
    BIKE("bike"),
    /**
     * 車・バス・電車のどれか。
     *
     * <p>⚠️ 「車」と言い切らない。判定材料は直近2点の平均速度だけで、時速60kmの 電車と時速60kmの車は同じ数字になる。区別するには OS の行動認識API
     * （iOS CMMotionActivity / Android Activity Recognition）が要るが、 ブラウザには相当するものが無い。持っている情報で言えるのは
     * 「速い乗り物で移動している」ところまで。住所をでっち上げないのと同じ理由で、 ここも分かる範囲までしか名乗らない。
     */
    VEHICLE("vehicle");

    private final String value;

    Movement(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    /** 平均速度から推定する。境界は日本の生活速度に合わせた概算 */
    public static Movement of(double speedKmh) {
        if (speedKmh < 2) return STILL;
        if (speedKmh < 8) return WALK;
        if (speedKmh < 20) return BIKE;
        return VEHICLE;
    }
}
