package com.mimamori.api.sos.dto;

import com.mimamori.api.sos.SosStatus;
import java.time.Instant;
import java.util.List;

/**
 * 緊急通報1件（SC-S01 / SC-S02）。
 *
 * <p>⚠️ responderIds は「向かっています」と答えた人の users.id。画面はこれを 使って自分が応答済みかを判定し、家族の一覧と突き合わせて名前を出す。
 */
public record SosResponse(
        Long id,
        Long userId,
        String memberName,
        String memberColor,
        Long groupId,
        double lat,
        double lng,
        SosStatus status,
        Instant triggeredAt,
        Instant resolvedAt,
        List<Long> responderIds) {}
