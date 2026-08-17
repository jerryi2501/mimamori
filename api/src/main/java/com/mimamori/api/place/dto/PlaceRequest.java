package com.mimamori.api.place.dto;

import com.mimamori.api.place.PlaceCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 場所の登録・編集（SC-P02）。
 *
 * <p>⚠️ 住所は受け取らない。サーバー側で逆ジオコーディングして入れる項目なので、 画面から送らせるとでっち上げた住所が保存できてしまう。
 */
public record PlaceRequest(
        @NotBlank(message = "場所の名前を入力してください") @Size(max = 50, message = "名前は50文字以内で入力してください")
                String name,
        /** null は OTHER として扱う（PlaceCategory.from） */
        PlaceCategory category,
        @NotNull(message = "緯度は必須です")
                @DecimalMin(value = "-90", message = "緯度が範囲外です")
                @DecimalMax(value = "90", message = "緯度が範囲外です")
                Double lat,
        @NotNull(message = "経度は必須です")
                @DecimalMin(value = "-180", message = "経度が範囲外です")
                @DecimalMax(value = "180", message = "経度が範囲外です")
                Double lng,
        // ⚠️ DB の CHECK（places_radius_check）と同じ範囲にする。ここで止めないと
        //    DataIntegrityViolationException（500）になり、利用者に理由が伝わらない。
        //    下限50mは GPS 誤差で出入りを繰り返さないための値（企画書 §2.4）
        @NotNull(message = "範囲は必須です")
                @Min(value = 50, message = "範囲は50m以上にしてください")
                @Max(value = 1000, message = "範囲は1000m以下にしてください")
                Integer radiusMeters,
        /** 編集時のみ使う。新規作成では null → 有効 */
        Boolean enabled) {}
