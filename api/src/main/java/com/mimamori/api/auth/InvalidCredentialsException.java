package com.mimamori.api.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * ログイン失敗。
 *
 * <p>⚠️ 「メールが存在しない」と「パスワードが違う」を区別しない。 区別すると、どのメールアドレスが登録済みかを総当たりで調べられてしまう。
 */
@ResponseStatus(value = HttpStatus.UNAUTHORIZED, reason = "メールアドレスまたはパスワードが違います")
public class InvalidCredentialsException extends RuntimeException {}
