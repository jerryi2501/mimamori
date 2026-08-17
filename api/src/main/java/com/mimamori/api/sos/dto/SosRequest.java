package com.mimamori.api.sos.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/**
 * 緊急通報の発信（SC-S01）。
 *
 * <p>⚠️ 座標は任意。端末が位置を取れないまま SOS を押す場面こそ本番なので、 送られてこなければサーバーが直近の位置を使う。両方無いときだけ断る。
 */
public record SosRequest(
        @NotNull(message = "グループが選ばれていません") Long groupId,
        @DecimalMin(value = "-90", message = "緯度が範囲外です")
                @DecimalMax(value = "90", message = "緯度が範囲外です")
                Double lat,
        @DecimalMin(value = "-180", message = "経度が範囲外です")
                @DecimalMax(value = "180", message = "経度が範囲外です")
                Double lng) {}
