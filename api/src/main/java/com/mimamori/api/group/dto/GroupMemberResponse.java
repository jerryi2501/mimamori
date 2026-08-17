package com.mimamori.api.group.dto;

import com.mimamori.api.group.GroupRole;
import com.mimamori.api.location.Movement;
import java.time.Instant;

/**
 * グループのメンバー1人（SC-M01 / SC-G03）。
 *
 * <p>⚠️ id は group_members.id ではなく users.id。
 *
 * <p>⚠️ 位置の項目は「共有オフ」または「一度も送信していない」とき すべて null になる。画面側は null 前提で書くこと。
 */
public record GroupMemberResponse(
        Long id,
        String name,
        String avatarColor,
        GroupRole role,
        boolean shareLocation,
        Instant joinedAt,
        // ---- 位置 ----
        Double lat,
        Double lng,
        Short batteryLevel,
        String address,
        Instant lastUpdatedAt,
        Movement movement,
        Integer speedKmh,
        boolean moving,
        /** Places API ができるまで常に null（SC-M01 の「自宅」「学校」表示） */
        String placeName) {}
