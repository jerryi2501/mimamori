package com.mimamori.api.chat.dto;

import java.time.Instant;

/**
 * メッセージ1件（SC-C02）。
 *
 * <p>⚠️ 既読の情報は持たない。既読表示は作らないと決めている（企画書 §2.5）。
 */
public record MessageResponse(
        Long id,
        Long senderId,
        String senderName,
        String senderColor,
        String body,
        Instant sentAt) {}
