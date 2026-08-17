package com.mimamori.api.realtime;

import java.security.Principal;

/**
 * WebSocket 接続1本に結びつく「誰か」。
 *
 * <p>⚠️ name は users.id の文字列にする。convertAndSendToUser の宛先が この name になるので、送る側は id だけ分かれば個人あてに配れる。
 * メールにすると、退会や変更のたびに宛先が変わってしまう。
 */
public record StompPrincipal(Long userId) implements Principal {

    @Override
    public String getName() {
        return String.valueOf(userId);
    }
}
