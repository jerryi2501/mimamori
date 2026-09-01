package com.mimamori.api.notification.dto;

import com.mimamori.api.notification.NotificationType;
import java.time.Instant;

/**
 * 通知1件（SC-N01）。
 *
 * <p>⚠️ payload を入れ子のまま返さず、ここで平らにする。画面は item.memberName の ように直接読んでいるので、入れ子だと全画面を書き換えることになる。
 *
 * <p>⚠️ 種類によって使う項目が違う（arrive/leave は placeName、battery は batteryLevel、sos は alertId）。 使わない項目は null。
 */
public record NotificationResponse(
        Long id,
        NotificationType type,
        boolean isRead,
        Instant createdAt,
        Long memberId,
        String memberName,
        String memberColor,
        String placeName,
        Integer batteryLevel,
        Long alertId,
        String groupName) {}
