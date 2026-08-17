package com.mimamori.api.place;

import com.mimamori.api.common.GeoUtils;
import com.mimamori.api.group.GroupMemberRepository;
import com.mimamori.api.notification.NotificationService;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 到着・出発の判定（F-06）。位置を1件受け取るたびに呼ぶ。
 *
 * <p>企画書 §5 のとおり、出入りが「変わったとき」だけ place_events に1行足す。
 */
@Service
@RequiredArgsConstructor
public class GeofenceService {

    /**
     * 出たと判定するための上乗せ距離（メートル）。
     *
     * <p>⚠️ 入る条件と出る条件を同じ半径にしてはいけない。境界ちょうどに居ると GPS の揺れだけで「到着・出発・到着…」を繰り返し、通知が鳴り続ける
     * （ヒステリシス）。入るのは半径ぴったり、出るのは半径＋この距離。
     */
    private static final double EXIT_MARGIN_M = 30;

    private final PlaceRepository placeRepository;
    private final PlaceEventRepository placeEventRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final NotificationService notificationService;

    /**
     * 新しい位置を受けて、必要なら到着・出発を記録し、家族に知らせる。
     *
     * @return 記録したイベント（無ければ空）
     */
    @Transactional
    public List<PlaceEvent> evaluate(Long userId, double lat, double lng) {
        List<Place> places = placeRepository.findEnabledForUser(userId);

        if (places.isEmpty()) {
            return List.of();
        }

        User user = userRepository.getReferenceById(userId);
        List<PlaceEvent> recorded = new ArrayList<>();

        for (Place place : places) {
            double distance = GeoUtils.distanceMeters(place.getLat(), place.getLng(), lat, lng);
            boolean wasInside = wasInside(place.getId(), userId);

            if (!wasInside && distance <= place.getRadiusM()) {
                recorded.add(record(place, user, PlaceEventType.ARRIVE));

            } else if (wasInside && distance > place.getRadiusM() + EXIT_MARGIN_M) {
                recorded.add(record(place, user, PlaceEventType.LEAVE));
            }
            // それ以外は「状態が変わっていない」ので何も書かない
        }

        return recorded;
    }

    /** 出入りを1件記録し、同じグループの他の人に通知する */
    private PlaceEvent record(Place place, User user, PlaceEventType type) {
        PlaceEvent event = placeEventRepository.save(new PlaceEvent(place, user, type));

        // ⚠️ 宛先は「その場所を持つグループ」のメンバーだけ。本人が入っている
        //    別のグループの人に、このグループの場所名を知らせてはいけない
        List<Long> recipients =
                groupMemberRepository.findMemberIdsExcept(place.getGroup().getId(), user.getId());

        notificationService.notifyPlaceEvent(
                recipients, user, place.getId(), place.getName(), type == PlaceEventType.ARRIVE);

        return event;
    }

    /**
     * その座標を含むセーフゾーンの名前。どれにも入っていなければ null。
     *
     * <p>⚠️ 円が重なっているときは中心が近いほうを選ぶ。登録順で決めると、 同じ場所なのに日によって「自宅」「学校」と表示が揺れる。
     *
     * <p>地図・履歴・リアルタイム配信の3か所が同じ判定を使う。以前は それぞれに同じコードが写されていた。
     */
    public static String nameOfContaining(List<Place> places, double lat, double lng) {
        Place best = null;
        double bestDistance = Double.MAX_VALUE;

        for (Place place : places) {
            double distance = GeoUtils.distanceMeters(place.getLat(), place.getLng(), lat, lng);

            if (distance <= place.getRadiusM() && distance < bestDistance) {
                best = place;
                bestDistance = distance;
            }
        }

        return best == null ? null : best.getName();
    }

    /** 直近の記録が ARRIVE なら中に居る扱い。記録が無ければ外 */
    private boolean wasInside(Long placeId, Long userId) {
        return placeEventRepository
                .findFirstByPlaceIdAndUserIdOrderByOccurredAtDesc(placeId, userId)
                .map(event -> event.getEventType() == PlaceEventType.ARRIVE)
                .orElse(false);
    }
}
