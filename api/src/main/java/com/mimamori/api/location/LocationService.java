package com.mimamori.api.location;

import com.mimamori.api.common.GeoUtils;
import com.mimamori.api.group.GroupMemberRepository;
import com.mimamori.api.location.dto.HistoryEventResponse;
import com.mimamori.api.location.dto.LocationBroadcast;
import com.mimamori.api.location.dto.LocationRequest;
import com.mimamori.api.location.dto.LocationResponse;
import com.mimamori.api.notification.NotificationService;
import com.mimamori.api.place.GeofenceService;
import com.mimamori.api.place.Place;
import com.mimamori.api.place.PlaceRepository;
import com.mimamori.api.realtime.RealtimePublisher;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LocationService {

    /**
     * この距離未満しか動いていなければ、前回の住所を使い回す。
     *
     * <p>デザインガイドライン §7 の「約100m動いたときだけ逆ジオコーディングする」を サーバー側で実装したもの。端末が毎回 GSI を叩かなくて済む。
     */
    private static final double ADDRESS_REUSE_M = 100;

    /**
     * 一日の区切りは日本時間で決める。
     *
     * <p>⚠️ DB は UTC で保存している。UTC のまま日付を切ると、日本の 深夜0時〜9時の記録が「前日」に入り、履歴が1日ずれる。
     */
    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

    /**
     * これを下回ったら家族に知らせる（F-08）。
     *
     * <p>frontend の batteryColor() が 20% 未満を赤にしているので、そこに合わせる。
     */
    private static final short LOW_BATTERY_PERCENT = 20;

    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final PlaceRepository placeRepository;
    private final GeofenceService geofenceService;
    private final HistorySegmenter historySegmenter;
    private final NotificationService notificationService;
    private final RealtimePublisher realtimePublisher;

    /** 企画書 §6 現在地の送信 */
    @Transactional
    public LocationResponse record(Long userId, LocationRequest request) {
        Location previous =
                locationRepository.findFirstByUserIdOrderByRecordedAtDesc(userId).orElse(null);

        User me = userRepository.getReferenceById(userId);

        Location location = new Location(me, request.lat(), request.lng());
        location.setAccuracy(request.accuracy());
        location.setBatteryLevel(request.batteryLevel());
        location.setAddress(resolveAddress(request, previous));

        locationRepository.save(location);

        // ⚠️ 保存した「あと」に判定する。位置が残っていないと、通知だけ出て
        //    地図では前の場所に居る、というずれが起きる（F-06）
        geofenceService.evaluate(userId, request.lat(), request.lng());
        notifyIfBatteryJustDropped(me, previous, request.batteryLevel());
        broadcast(userId, location, previous);

        return new LocationResponse(
                location.getId(), location.getRecordedAt(), location.getAddress());
    }

    /**
     * 動いたことを、位置を共有しているグループにだけ配る（企画書 §6）。
     *
     * <p>⚠️ 宛先はグループごと。同じ人でも「家族」には見せて「バイト先」には 見せない、が成り立つ必要がある。
     *
     * <p>⚠️ 場所の名前もグループごとに違う。同じ座標が家族の「自宅」であっても、 バイト先のグループにその名前を漏らしてはいけない。
     */
    private void broadcast(Long userId, Location latest, Location previous) {
        MovementEstimate estimate = MovementEstimate.of(previous, latest);

        for (Long groupId : groupMemberRepository.findSharingGroupIds(userId)) {
            String placeName =
                    GeofenceService.nameOfContaining(
                            placeRepository.findByGroupIdAndEnabledTrue(groupId),
                            latest.getLat(),
                            latest.getLng());

            realtimePublisher.toGroup(
                    groupId,
                    "location",
                    new LocationBroadcast(
                            userId,
                            latest.getLat(),
                            latest.getLng(),
                            latest.getBatteryLevel(),
                            latest.getAddress(),
                            latest.getRecordedAt(),
                            estimate.movement(),
                            estimate.speedKmh(),
                            estimate.movement() != Movement.STILL,
                            placeName));
        }
    }

    /**
     * 電池が「今まさに」しきい値を下回ったときだけ知らせる（F-08）。
     *
     * <p>⚠️ 「20%未満なら通知」にしてはいけない。位置は数十秒おきに届くので、 充電されるまで同じ通知が延々と積み上がる。ジオフェンスと同じで、
     * 前回の値と比べて「またいだ瞬間」だけを拾う。
     */
    private void notifyIfBatteryJustDropped(User me, Location previous, Short level) {
        // 端末が電池を送ってこない場合がある（Firefox / Safari は Battery API 非対応）
        if (level == null || level >= LOW_BATTERY_PERCENT) {
            return;
        }
        // 前回も既に低かったなら、もう知らせてある
        if (previous != null
                && previous.getBatteryLevel() != null
                && previous.getBatteryLevel() < LOW_BATTERY_PERCENT) {
            return;
        }

        notificationService.notifyLowBattery(
                groupMemberRepository.findRelatedUserIds(me.getId()), me, level);
    }

    /** userId ごとに「最新→ひとつ前」の順で並んだ位置を返す */
    @Transactional(readOnly = true)
    public Map<Long, List<Location>> findRecentByUsers(Collection<Long> userIds) {
        // ⚠️ 空のまま渡すと SQL が IN () になって構文エラーになる
        if (userIds.isEmpty()) {
            return Map.of();
        }

        return locationRepository.findLatestTwoPerUser(userIds).stream()
                .collect(Collectors.groupingBy(location -> location.getUser().getId()));
    }

    /** 端末が住所を送ってこなかったとき、前回の住所を引き継げるか判断する */
    private String resolveAddress(LocationRequest request, Location previous) {
        if (request.address() != null) {
            return request.address();
        }
        if (previous == null || previous.getAddress() == null) {
            return null;
        }

        double moved =
                GeoUtils.distanceMeters(
                        previous.getLat(), previous.getLng(), request.lat(), request.lng());

        // ⚠️ 遠くまで動いていたら null のままにする。
        //    古い住所を貼り付けると「でっち上げ」になる（CLAUDE.md）
        return moved < ADDRESS_REUSE_M ? previous.getAddress() : null;
    }

    /** SC-M03 指定した日の移動履歴 */
    @Transactional(readOnly = true)
    public List<HistoryEventResponse> findHistory(
            Long viewerId, Long targetUserId, LocalDate date) {
        // 自分の履歴はいつでも見られる
        if (!viewerId.equals(targetUserId)
                && !groupMemberRepository.canViewLocationOf(viewerId, targetUserId)) {
            throw new LocationNotVisibleException();
        }

        List<Location> points =
                locationRepository.findByUserIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                        targetUserId,
                        date.atStartOfDay(JST).toInstant(),
                        date.plusDays(1).atStartOfDay(JST).toInstant());

        // 滞在先に「自宅」「学校」と名前を付けるための材料。
        // ⚠️ target の全グループではなく、viewer と共通のグループの場所だけ。
        //    そうしないと viewer が入っていないグループの場所名まで見えてしまう
        List<Place> places = placeRepository.findSharedEnabled(viewerId, targetUserId);

        return historySegmenter.segment(points, places);
    }
}
