package com.mimamori.api.auth;

import com.mimamori.api.common.ApiException;
import org.springframework.http.HttpStatus;

/**
 * ログイン失敗。
 *
 * <p>⚠️ 「メールが存在しない」と「パスワードが違う」を区別しない。 区別すると、どのメールアドレスが登録済みかを総当たりで調べられてしまう。
 */
public class InvalidCredentialsException extends ApiException {

    public InvalidCredentialsException() {
        super(HttpStatus.UNAUTHORIZED, "メールアドレスまたはパスワードが違います");
    }
}
