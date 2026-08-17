package com.mimamori.api.place.dto;

import com.mimamori.api.place.PlaceCategory;

/**
 * セーフゾーン1件（SC-P01 / SC-P02）。
 *
 * <p>⚠️ 項目名は radiusMeters。DB の列は radius_m だが、画面が半径を formatDistance(place.radiusMeters)
 * で表示しているのに合わせる。
 */
public record PlaceResponse(
        Long id,
        Long groupId,
        String name,
        PlaceCategory category,
        double lat,
        double lng,
        int radiusMeters,
        /** 逆ジオコーディングできていなければ null。でっち上げない */
        String address,
        boolean enabled) {}
