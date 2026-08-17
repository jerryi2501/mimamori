package com.mimamori.api.ping.dto;

import jakarta.validation.constraints.NotNull;

/** 呼び出しを送る（F-11 / 親側）。 */
public record PingRequest(@NotNull(message = "呼び出す相手が指定されていません") Long targetUserId) {}
