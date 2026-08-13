package com.mimamori.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 新規登録の入力（SC-A02）。
 *
 * <p>record を使う。値を持つだけで変更しないので、getter や equals を 自分で書く必要がない。
 */
public record RegisterRequest(
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72) String password) {}
