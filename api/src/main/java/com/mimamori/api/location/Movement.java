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
    CAR("car");

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
        return CAR;
    }
}
