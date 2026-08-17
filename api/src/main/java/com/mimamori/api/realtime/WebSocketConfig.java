package com.mimamori.api.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * リアルタイム配信の土台（企画書 §6）。
 *
 * <p>この土台の上で4つの流れを配る: 位置・SOS・呼び出し・トーク。
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthInterceptor stompAuthInterceptor;

    @Value("${mimamori.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // ⚠️ ハンドシェイクは HTTP なので CORS が効く。REST と同じ許可元にそろえる。
        //    setAllowedOrigins("*") にすると本番で誰でも繋げてしまう
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigins);
        // ⚠️ SockJS は使わない。対象ブラウザはすべて WebSocket を持っているし、
        //    SockJS を挟むとフォールバック用の HTTP 経路まで開くことになる
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // /topic = 複数人へ、/queue = 個人へ（呼び出しに使う）
        // ⚠️ 単純なメモリ内ブローカー。1インスタンスの間だけ有効で、
        //    複数台に増やすと台をまたいで配信されない。そのときは
        //    RabbitMQ などの外部ブローカーに差し替える（Railway では1台想定）
        registry.enableSimpleBroker("/topic", "/queue");

        // 画面から送るときの接頭辞。今は使っていない（送信はすべて REST）。
        // ⚠️ 送信を REST のままにしているのは、保存の成否をそのまま
        //    HTTP のステータスで返せるため。WebSocket 経由だと失敗が伝えにくい
        registry.setApplicationDestinationPrefixes("/app");

        // /user/... 宛ての変換に使う接頭辞
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthInterceptor);
    }
}
