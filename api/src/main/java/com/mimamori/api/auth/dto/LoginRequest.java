package com.mimamori.api.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** ログインの入力（SC-A01）。 */
public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
