package com.mimamori.api.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * リアルタイム配信の出口（企画書 §6）。
 *
 * <p>宛先の文字列をここだけに閉じ込める。各 service は「何が起きたか」を 伝えるだけで、どの topic に流れるかを知らない。
 *
 * <p>⚠️ 配信の失敗で本処理を巻き添えにしないこと。保存は成功しているのに 例外で 500 を返すと、画面は「送れなかった」と誤解して同じ操作を繰り返す。
 * リアルタイムはあくまで「おまけ」で、正は REST + DB。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    /** グループ全員へ（位置・SOS・ゾーン出入り） */
    public void toGroup(Long groupId, String channel, Object payload) {
        send("/topic/group/" + groupId + "/" + channel, payload);
    }

    /** その会話の参加者へ（トーク） */
    public void toConversation(Long conversationId, Object payload) {
        send("/topic/conversation/" + conversationId + "/message", payload);
    }

    /**
     * ひとりだけへ（呼び出し・通知）。
     *
     * <p>⚠️ 宛先は users.id の文字列。StompPrincipal.getName() と一致させる。
     */
    public void toUser(Long userId, String channel, Object payload) {
        try {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId), "/queue/" + channel, payload);
        } catch (RuntimeException e) {
            log.warn("リアルタイム配信に失敗しました（宛先 user {}）: {}", userId, e.getMessage());
        }
    }

    private void send(String destination, Object payload) {
        try {
            messagingTemplate.convertAndSend(destination, payload);
        } catch (RuntimeException e) {
            log.warn("リアルタイム配信に失敗しました（宛先 {}）: {}", destination, e.getMessage());
        }
    }
}
