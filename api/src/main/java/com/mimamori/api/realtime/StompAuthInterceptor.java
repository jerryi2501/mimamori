package com.mimamori.api.realtime;

import com.mimamori.api.auth.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * STOMP の CONNECT フレームでトークンを確かめ、接続に「誰か」を結びつける。
 *
 * <p>⚠️ WebSocket は最初のハンドシェイクしか HTTP ではない。以降は普通の HTTP ヘッダーが無いので、JwtAuthFilter は効かない。認証は STOMP の
 * CONNECT ヘッダーで別途やる必要がある。
 *
 * <p>⚠️ ブラウザの WebSocket API はハンドシェイクに独自ヘッダーを付けられない。 だからトークンは STOMP の CONNECT フレーム側に載せる（フロントの
 * connectHeaders）。 URL のクエリに付ける手もあるが、アクセスログやプロキシに残るので避ける。
 */
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // CONNECT のときだけ見る。以降のフレームは接続に紐づいた Principal を引き継ぐ
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        Long userId = extractUserId(accessor);

        // ⚠️ ここで例外を投げると接続が拒否される。それが正しい。
        //    通してしまうと、誰でも他人のグループの配信を購読できる
        if (userId == null) {
            throw new StompAuthenticationException();
        }

        accessor.setUser(new StompPrincipal(userId));
        return message;
    }

    private Long extractUserId(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");

        if (header == null || !header.startsWith(PREFIX)) {
            return null;
        }
        return jwtService.extractUserId(header.substring(PREFIX.length()));
    }
}
