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
        @NotBlank(message = "名前を入力してください") @Size(max = 50, message = "名前は50文字以内で入力してください")
                String name,
        @NotBlank(message = "メールアドレスを入力してください")
                @Email(message = "メールアドレスの形式が正しくありません")
                @Size(max = 255, message = "メールアドレスが長すぎます")
                String email,
        // ⚠️ message を必ず書く。省略すると Hibernate Validator の既定文
        //    "size must be between 8 and 72" がそのまま画面に出る
        @NotBlank(message = "パスワードを入力してください")
                @Size(min = 8, max = 72, message = "パスワードは8文字以上にしてください")
                String password) {}
