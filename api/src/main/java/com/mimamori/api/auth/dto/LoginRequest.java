package com.mimamori.api.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** ログインの入力（SC-A01）。 */
public record LoginRequest(
        @NotBlank(message = "メールアドレスを入力してください") String email,
        // ⚠️ ここで @Size は付けない。登録時の規則を変えたときに、
        //    既存の利用者が「形式が違う」でログインできなくなる
        @NotBlank(message = "パスワードを入力してください") String password) {}
