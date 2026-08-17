package com.mimamori.api.realtime;

import org.springframework.messaging.MessagingException;

/**
 * STOMP の接続時に本人確認ができなかった。
 *
 * <p>⚠️ 理由は伝えない。「期限切れ」か「偽造」かが分かると攻撃の手がかりになる （JwtService と同じ方針）。フロントは再ログインさせればよい。
 */
class StompAuthenticationException extends MessagingException {

    StompAuthenticationException() {
        super("認証が必要です");
    }
}
