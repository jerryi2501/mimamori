package com.mimamori.api.notification;

import com.mimamori.api.notification.dto.NotificationResponse;
import com.mimamori.api.realtime.RealtimePublisher;
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
    private final RealtimePublisher realtimePublisher;

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

    /**
     * F-03 グループの出入りを知らせる（参加・退出・削除された・グループ消滅）。
     *
     * <p>⚠️ グループ名は id ではなく名前で持つ。グループが消えたあとも 「◯◯が解散しました」と書ける必要があるため。
     */
    @Transactional
    public void notifyGroupEvent(
            List<Long> recipientIds, User member, String groupName, NotificationType type) {

        Map<String, Object> payload = NotificationPayload.ofMember(member);
        payload.put(NotificationPayload.GROUP_NAME, groupName);

        notifyAll(recipientIds, type, payload);
    }

    /**
     * F-04 SOS のその後（解除された・誰かが向かっている）を知らせる。
     *
     * <p>⚠️ 解除の通知が無いと、発信の通知だけが残る。家族は「まだ続いている」と 思ったまま、無事になったことを知る手立てがない。
     */
    @Transactional
    public void notifySosUpdate(
            List<Long> recipientIds, User member, Long alertId, NotificationType type) {

        Map<String, Object> payload = NotificationPayload.ofMember(member);
        payload.put(NotificationPayload.ALERT_ID, alertId);

        notifyAll(recipientIds, type, payload);
    }

    /**
     * F-11 3分たっても応答が無かったことを、呼び出した人に知らせる。
     *
     * <p>⚠️ 宛先は呼び出した本人だけ（notifyPingOk と同じ理由）。 ⚠️ member は「応答しなかった人」。呼んだ人ではない。
     */
    @Transactional
    public void notifyPingNoResponse(Long recipientId, User member) {
        notifyAll(
                List.of(recipientId),
                NotificationType.PING_NO_RESPONSE,
                NotificationPayload.ofMember(member));
    }

    /**
     * F-03 位置共有の切り替えをオーナーに知らせる。
     *
     * <p>⚠️ 宛先はオーナーだけ。全員に配ると「誰が共有を切ったか」が家族中に流れ、 見守るアプリではなく見張るアプリになる（企画書 §1 の前提）。
     *
     * <p>⚠️ オンに戻したときも知らせる。オフだけ通知すると、オーナーの側には 「切ったまま」という印象だけが残り続ける。
     */
    @Transactional
    public void notifyShareChanged(Long ownerId, User member, String groupName, boolean sharing) {
        Map<String, Object> payload = NotificationPayload.ofMember(member);
        payload.put(NotificationPayload.GROUP_NAME, groupName);

        notifyAll(
                List.of(ownerId),
                sharing ? NotificationType.SHARE_ON : NotificationType.SHARE_OFF,
                payload);
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

        List<Notification> saved =
                notificationRepository.saveAll(
                        userIds.stream()
                                .map(
                                        userId ->
                                                new Notification(
                                                        userRepository.getReferenceById(userId),
                                                        type,
                                                        new HashMap<>(payload)))
                                .toList());

        // ⚠️ 保存の「あと」に配る。先に送ると、受け取った画面が一覧を取りに来た
        //    ときにまだ表に無く、ベルの数字と中身が食い違う。
        // ⚠️ 宛先は本人だけ（/user/queue/…）。通知は個人あてなので、
        //    グループ全体に流すと他人あての通知まで見えてしまう。
        saved.forEach(
                notification ->
                        realtimePublisher.toUser(
                                notification.getUser().getId(),
                                "notification",
                                toResponse(notification)));
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
                NotificationPayload.asLong(payload.get(NotificationPayload.ALERT_ID)),
                NotificationPayload.asString(payload.get(NotificationPayload.GROUP_NAME)));
    }
}
