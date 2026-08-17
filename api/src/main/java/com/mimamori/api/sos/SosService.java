package com.mimamori.api.sos;

import com.mimamori.api.group.GroupMemberRepository;
import com.mimamori.api.group.GroupRepository;
import com.mimamori.api.location.Location;
import com.mimamori.api.location.LocationRepository;
import com.mimamori.api.notification.NotificationService;
import com.mimamori.api.realtime.RealtimePublisher;
import com.mimamori.api.sos.dto.SosRequest;
import com.mimamori.api.sos.dto.SosResponse;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SosService {

    private final SosAlertRepository sosAlertRepository;
    private final SosResponderRepository sosResponderRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final RealtimePublisher realtimePublisher;

    /** SC-S01 発信 */
    @Transactional
    public SosResponse send(Long userId, SosRequest request) {
        requireMember(request.groupId(), userId);

        double[] point = resolvePoint(userId, request);

        // ⚠️ getReferenceById ではなく実体を読む。通知に名前と色を載せるため。
        //   proxy のまま getName() を呼んでも動くが、読むことが分かっているなら
        //   最初から1回で取ったほうが素直
        User me = userRepository.findById(userId).orElseThrow(SosNotAccessibleException::new);

        SosAlert alert =
                sosAlertRepository.save(
                        new SosAlert(
                                me,
                                groupRepository.getReferenceById(request.groupId()),
                                point[0],
                                point[1]));

        // ⚠️ 通知は保存のあと。先に送ると、家族が開いたときに通報がまだ無い
        notificationService.notifySos(
                groupMemberRepository.findMemberIdsExcept(request.groupId(), userId),
                me,
                alert.getId());

        SosResponse response = toResponse(alert, List.of());
        realtimePublisher.toGroup(request.groupId(), "sos", response);

        return response;
    }

    /** SC-S02 1件を読む */
    @Transactional(readOnly = true)
    public SosResponse findOne(Long alertId, Long userId) {
        SosAlert alert = requireVisible(alertId, userId);
        return toResponse(alert, responderIds(alertId));
    }

    /** SC-S01 解除。発信した本人だけ */
    @Transactional
    public SosResponse resolve(Long alertId, Long userId) {
        SosAlert alert = requireVisible(alertId, userId);

        if (!alert.getUser().getId().equals(userId)) {
            throw new OnlySenderCanResolveException();
        }
        if (alert.getStatus() == SosStatus.RESOLVED) {
            throw new SosAlreadyResolvedException();
        }

        alert.setStatus(SosStatus.RESOLVED);
        alert.setResolvedAt(Instant.now());

        return publish(alert);
    }

    /**
     * SC-S02 「向かっています」。
     *
     * <p>⚠️ 誰が向かっているか分からないと、家族全員が同時に同じ場所へ 向かってしまう（企画書 §2.3 と同じ考え方）。
     */
    @Transactional
    public SosResponse respond(Long alertId, Long userId) {
        SosAlert alert = requireVisible(alertId, userId);

        if (alert.getStatus() == SosStatus.RESOLVED) {
            throw new SosAlreadyResolvedException();
        }

        // 二重に押しても増やさない。DB の UNIQUE 制約に当てて500にしない
        if (!sosResponderRepository.existsBySosAlertIdAndUserId(alertId, userId)) {
            sosResponderRepository.save(
                    new SosResponder(alert, userRepository.getReferenceById(userId)));
        }

        // ⚠️ 応答も配る。これが無いと、誰かが向かっていることが他の人の
        //    画面に出ず、家族が次々と同じ場所へ駆けつけてしまう
        return publish(alert);
    }

    /** 変化した通報をグループへ配り、そのまま応答として返す */
    private SosResponse publish(SosAlert alert) {
        SosResponse response = toResponse(alert, responderIds(alert.getId()));
        realtimePublisher.toGroup(alert.getGroup().getId(), "sos", response);

        return response;
    }

    /**
     * 通報する座標を決める。
     *
     * <p>端末が送ってくればそれを使い、無ければ直近の位置で代用する。 どちらも無ければ断る（でっち上げない）。
     */
    private double[] resolvePoint(Long userId, SosRequest request) {
        if (request.lat() != null && request.lng() != null) {
            return new double[] {request.lat(), request.lng()};
        }

        Location last =
                locationRepository
                        .findFirstByUserIdOrderByRecordedAtDesc(userId)
                        .orElseThrow(LocationUnknownException::new);

        return new double[] {last.getLat(), last.getLng()};
    }

    private void requireMember(Long groupId, Long userId) {
        groupMemberRepository
                .findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(SosNotAccessibleException::new);
    }

    /** その通報のグループに居る人だけが見られる */
    private SosAlert requireVisible(Long alertId, Long userId) {
        SosAlert alert =
                sosAlertRepository.findById(alertId).orElseThrow(SosNotAccessibleException::new);

        requireMember(alert.getGroup().getId(), userId);
        return alert;
    }

    private List<Long> responderIds(Long alertId) {
        return sosResponderRepository.findBySosAlertId(alertId).stream()
                .map(responder -> responder.getUser().getId())
                .toList();
    }

    private static SosResponse toResponse(SosAlert alert, List<Long> responderIds) {
        User sender = alert.getUser();

        return new SosResponse(
                alert.getId(),
                sender.getId(),
                sender.getName(),
                sender.getAvatarColor(),
                alert.getGroup().getId(),
                alert.getLat(),
                alert.getLng(),
                alert.getStatus(),
                alert.getTriggeredAt(),
                alert.getResolvedAt(),
                responderIds);
    }
}
