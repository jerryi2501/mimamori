package com.mimamori.api.place.dto;

import com.mimamori.api.place.PlaceEventType;
import java.time.Instant;

/**
 * ゾーン履歴の1行（SC-P01 の下部）。
 *
 * <p>⚠️ 完成した文章は持たない。誰が・どこに・出入りのどちらか、という材料だけ返し、 文言は画面側で組み立てる（企画書 §5 の注記）。日本語の語順を後から変えられるようにするため。
 */
public record PlaceEventResponse(
        Long id,
        Long placeId,
        String placeName,
        Long memberId,
        String memberName,
        PlaceEventType type,
        Instant occurredAt) {}
