package com.mimamori.api.notification;

import com.mimamori.api.notification.dto.NotificationResponse;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 通知（SC-N01）。
 *
 * <p>作る側（ジオフェンス・電池など）はこの service だけを呼ぶ。 どのテーブルにどう入るかを呼び出し側に知らせない。
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    /** 一覧の既定件数。無限に増える表なので必ず上限を置く */
    private static final int DEFAULT_LIMIT = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /** SC-N01 一覧（新しい順） */
    @Transactional(readOnly = true)
    public List<NotificationResponse> findMine(Long userId, Integer limit) {
        int size = limit == null || limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, 200);

        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, size))
                .stream()
                .map(NotificationService::toResponse)
                .toList();
    }

    /** 地図のベルのバッジ用 */
    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    /** すべて既読にする。戻り値は既読にした件数 */
    @Transactional
    public int markAllRead(Long userId) {
        return notificationRepository.markAllRead(userId);
    }

    /**
     * F-06 到着・出発を家族に知らせる。
     *
     * @param arrived true なら到着、false なら出発
     */
    @Transactional
    public void notifyPlaceEvent(
            List<Long> recipientIds, User member, Long placeId, String placeName, boolean arrived) {

        Map<String, Object> payload = NotificationPayload.ofMember(member);
        payload.put(NotificationPayload.PLACE_ID, placeId);
        payload.put(NotificationPayload.PLACE_NAME, placeName);

        notifyAll(
                recipientIds, arrived ? NotificationType.ARRIVE : NotificationType.LEAVE, payload);
    }

    /** F-04 緊急通報を家族に知らせる。画面はここから SC-S02 へ飛べる */
    @Transactional
    public void notifySos(List<Long> recipientIds, User member, Long alertId) {
        Map<String, Object> payload = NotificationPayload.ofMember(member);
        payload.put(NotificationPayload.ALERT_ID, alertId);

        notifyAll(recipientIds, NotificationType.SOS, payload);
    }

    /**
     * F-11 「大丈夫だよ」の応答を、呼び出した人に知らせる。
     *
     * <p>⚠️ 宛先は呼び出した本人だけ。家族全員に配ると、親子のやりとりが 毎回グループ全体に流れてしまう。
     */
    @Transactional
    public void notifyPingOk(Long recipientId, User member) {
        notifyAll(
                List.of(recipientId),
                NotificationType.PING_OK,
                NotificationPayload.ofMember(member));
    }

    /** F-08 電池が少なくなったことを家族に知らせる */
    @Transactional
    public void notifyLowBattery(List<Long> recipientIds, User member, int batteryLevel) {
        Map<String, Object> payload = NotificationPayload.ofMember(member);
        payload.put(NotificationPayload.BATTERY_LEVEL, batteryLevel);

        notifyAll(recipientIds, NotificationType.BATTERY, payload);
    }

    /**
     * 同じ内容を複数の相手に配る。
     *
     * <p>⚠️ payload は宛先ごとに複製する。同じ Map を全員で共有すると、 あとでどこかが書き換えたときに全員ぶん変わる事故につながる。
     */
    private void notifyAll(List<Long> userIds, NotificationType type, Map<String, Object> payload) {
        if (userIds.isEmpty()) {
            return;
        }

        notificationRepository.saveAll(
                userIds.stream()
                        .map(
                                userId ->
                                        new Notification(
                                                userRepository.getReferenceById(userId),
                                                type,
                                                new HashMap<>(payload)))
                        .toList());
    }

    private static NotificationResponse toResponse(Notification notification) {
        Map<String, Object> payload = notification.getPayload();

        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.isRead(),
                notification.getCreatedAt(),
                NotificationPayload.asLong(payload.get(NotificationPayload.MEMBER_ID)),
                NotificationPayload.asString(payload.get(NotificationPayload.MEMBER_NAME)),
                NotificationPayload.asString(payload.get(NotificationPayload.MEMBER_COLOR)),
                NotificationPayload.asString(payload.get(NotificationPayload.PLACE_NAME)),
                NotificationPayload.asInt(payload.get(NotificationPayload.BATTERY_LEVEL)),
                NotificationPayload.asLong(payload.get(NotificationPayload.ALERT_ID)));
    }
}
