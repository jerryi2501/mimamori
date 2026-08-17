package com.mimamori.api.group.dto;

import com.mimamori.api.group.GroupRole;
import java.time.Instant;

/**
 * グループ1件（SC-G01 / SC-G03）。
 *
 * <p>⚠️ role と shareLocation は「グループの属性」ではなく 「このAPIを呼んだ人の、このグループでの状態」。同じグループでも 見る人によって値が変わる。
 */
public record GroupResponse(
        Long id,
        String name,
        String inviteCode,
        GroupRole role,
        boolean shareLocation,
        int memberCount,
        Instant createdAt) {}
