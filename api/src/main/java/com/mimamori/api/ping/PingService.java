package com.mimamori.api.ping;

import com.mimamori.api.group.GroupMemberRepository;
import com.mimamori.api.notification.NotificationService;
import com.mimamori.api.ping.dto.PingResponse;
import com.mimamori.api.realtime.RealtimePublisher;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PingService {

    /** これを過ぎても応答が無ければ「応答なし」にする（企画書 §2.3） */
    static final Duration TIMEOUT = Duration.ofMinutes(3);

    private final PingRepository pingRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final RealtimePublisher realtimePublisher;

    /** F-11 呼び出しを送る（親側） */
    @Transactional
    public PingResponse send(Long fromUserId, Long targetUserId) {
        if (fromUserId.equals(targetUserId)) {
            throw new CannotPingSelfException();
        }
        requireSameGroup(fromUserId, targetUserId);

        User from =
                userRepository.findById(fromUserId).orElseThrow(PingNotAccessibleException::new);

        Ping ping =
                pingRepository.save(new Ping(from, userRepository.getReferenceById(targetUserId)));

        PingResponse response = toResponse(ping);

        // ⚠️ 宛先は呼ばれた本人だけ。/topic に流すとグループ全員の端末で
        //    警報音が鳴ってしまう（F-11 の要点は「その子だけ」を鳴らすこと）
        realtimePublisher.toUser(targetUserId, "ping", response);

        return response;
    }

    /** SC-M04 1件を読む。送った人と呼ばれた人だけ */
    @Transactional(readOnly = true)
    public PingResponse findOne(Long pingId, Long userId) {
        return toResponse(requireVisible(pingId, userId));
    }

    /** SC-M02 「自分がこの相手に送った直近の呼び出し」。無ければ null */
    @Transactional(readOnly = true)
    public PingResponse findLatestSentTo(Long fromUserId, Long targetUserId) {
        return pingRepository
                .findFirstByFromUserIdAndToUserIdOrderBySentAtDesc(fromUserId, targetUserId)
                .map(PingService::toResponse)
                .orElse(null);
    }

    /** F-11 応答する（子側） */
    @Transactional
    public PingResponse respond(Long pingId, Long userId, PingStatus status) {
        if (status != PingStatus.OK && status != PingStatus.LATER) {
            throw new InvalidPingStatusException();
        }

        Ping ping = requireVisible(pingId, userId);

        if (!ping.getToUser().getId().equals(userId)) {
            throw new OnlyTargetCanRespondException();
        }

        ping.setStatus(status);
        ping.setRespondedAt(Instant.now());

        // 「大丈夫だよ」のときだけ知らせる。LATER は返事ではないので鳴らさない
        if (status == PingStatus.OK) {
            notificationService.notifyPingOk(
                    ping.getFromUser().getId(),
                    userRepository.findById(userId).orElseThrow(PingNotAccessibleException::new));
        }

        PingResponse response = toResponse(ping);

        // 応答は呼び出した側へ返す。相手の画面が待ち状態から変わる
        realtimePublisher.toUser(ping.getFromUser().getId(), "ping", response);

        return response;
    }

    /**
     * 3分を過ぎた呼び出しを「応答なし」にする。定期実行のジョブから呼ぶ。
     *
     * <p>⚠️ 「読むときに計算」では足りない。親に知らせる必要があるので、 誰も画面を開いていなくても状態が変わらないといけない。
     *
     * @return 応答なしに変えた件数
     */
    @Transactional
    public int expireStalePings() {
        List<Ping> stale =
                pingRepository.findByStatusAndSentAtBefore(
                        PingStatus.SENT, Instant.now().minus(TIMEOUT));

        for (Ping ping : stale) {
            ping.setStatus(PingStatus.NO_RESPONSE);
            // 3分待った親の画面を、開いたままでも「応答なし」に変える
            realtimePublisher.toUser(ping.getFromUser().getId(), "ping", toResponse(ping));
        }

        return stale.size();
    }

    /** 同じグループに1つでも一緒に居るか */
    private void requireSameGroup(Long userId, Long otherUserId) {
        if (!groupMemberRepository.findRelatedUserIds(userId).contains(otherUserId)) {
            throw new PingNotAccessibleException();
        }
    }

    private Ping requireVisible(Long pingId, Long userId) {
        Ping ping = pingRepository.findById(pingId).orElseThrow(PingNotAccessibleException::new);

        if (!ping.getFromUser().getId().equals(userId)
                && !ping.getToUser().getId().equals(userId)) {
            throw new PingNotAccessibleException();
        }
        return ping;
    }

    private static PingResponse toResponse(Ping ping) {
        return new PingResponse(
                ping.getId(),
                ping.getFromUser().getId(),
                ping.getFromUser().getName(),
                ping.getToUser().getId(),
                ping.getStatus(),
                ping.getSentAt(),
                ping.getRespondedAt());
    }
}
