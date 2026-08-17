package com.mimamori.api.common;

import java.util.Objects;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 例外を JSON に変換する場所。
 *
 * <p>⚠️ ここに @ExceptionHandler(Exception.class) を足して e.getMessage() を 返してはいけない。想定外の例外の中身（テーブル名や
 * SQL）が外に漏れる。 想定外は Spring の既定（本文なしの500）に任せるのが安全。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 自分で投げた、利用者向けのエラー */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApi(ApiException e) {
        return ResponseEntity.status(e.getStatus()).body(new ApiError(e.getMessage()));
    }

    /**
     * @Valid の入力チェックに失敗したとき
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException e) {
        // 最初の1件だけ返す。まとめて出しても画面には1行しか出ないため
        String message =
                e.getBindingResult().getFieldErrors().stream()
                        .map(FieldError::getDefaultMessage)
                        .filter(Objects::nonNull)
                        .findFirst()
                        .orElse("入力内容を確認してください");

        return ResponseEntity.badRequest().body(new ApiError(message));
    }
}
