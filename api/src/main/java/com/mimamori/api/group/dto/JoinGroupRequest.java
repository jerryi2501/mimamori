package com.mimamori.api.group.dto;

import jakarta.validation.constraints.NotBlank;

/** SC-G02 招待コードで参加 */
public record JoinGroupRequest(@NotBlank(message = "招待コードを入力してください") String code) {}
