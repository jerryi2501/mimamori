package com.mimamori.api.auth.dto;

/**
 * ログイン・登録の応答。
 *
 * <p>⚠️ passwordHash を絶対に含めないこと。エンティティをそのまま返すと 漏れるので、返す形は必ず DTO で定義する。
 */
public record AuthResponse(String token, Long id, String name, String email, String avatarColor) {}
