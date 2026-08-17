package com.mimamori.api.ping.dto;

import com.mimamori.api.ping.PingStatus;
import java.time.Instant;

/**
 * 呼び出し1件（SC-M02 / SC-M04）。
 *
 * <p>⚠️ status は大文字のまま返す。画面の PING_VIEW が SENT / OK / LATER / NO_RESPONSE をキーにしているため（Movement
 * のように小文字化しない）。
 */
public record PingResponse(
        Long id,
        Long fromUserId,
        String fromName,
        Long toUserId,
        PingStatus status,
        Instant sentAt,
        Instant respondedAt) {}
