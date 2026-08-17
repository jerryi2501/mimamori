package com.mimamori.api.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 画面にそのまま出してよいエラー。
 *
 * <p>⚠️ ここに入れてよいのは「利用者が読んで自分で直せる」文言だけ。 NullPointerException や SQL の例外をそのまま渡してはいけない。
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
