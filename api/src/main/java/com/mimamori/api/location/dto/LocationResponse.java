package com.mimamori.api.location.dto;

import java.time.Instant;

/**
 * 位置を受け取った結果。
 *
 * <p>address を返すのは、サーバー側が前回の住所を引き継いだ場合に 端末がそれを知る必要があるため（逆ジオコーディングを省ける）。
 */
public record LocationResponse(Long id, Instant recordedAt, String address) {}
