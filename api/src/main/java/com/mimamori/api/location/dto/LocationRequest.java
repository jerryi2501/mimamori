package com.mimamori.api.location.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 端末から送られてくる現在地（企画書 §6）。
 *
 * <p>⚠️ 緯度経度の範囲を必ず検証する。navigator.geolocation の値をそのまま 信じると、壊れた端末の値がそのまま地図に載り、原因不明の表示崩れになる。
 */
public record LocationRequest(
        @NotNull(message = "緯度は必須です")
                @DecimalMin(value = "-90", message = "緯度が範囲外です")
                @DecimalMax(value = "90", message = "緯度が範囲外です")
                Double lat,
        @NotNull(message = "経度は必須です")
                @DecimalMin(value = "-180", message = "経度が範囲外です")
                @DecimalMax(value = "180", message = "経度が範囲外です")
                Double lng,
        /** GPS の誤差（メートル）。取れない端末があるので任意 */
        Float accuracy,
        /** ⚠️ Firefox / Safari は Battery API 非対応なので null あり（企画書 §2.4） */
        @Min(value = 0, message = "電池残量が範囲外です") @Max(value = 100, message = "電池残量が範囲外です")
                Short batteryLevel,
        /** 逆ジオコーディング済みの住所。取れなければ送らない（でっち上げない） */
        @Size(max = 255, message = "住所が長すぎます") String address) {}
