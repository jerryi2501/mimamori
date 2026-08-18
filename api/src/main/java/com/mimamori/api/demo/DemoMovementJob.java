package com.mimamori.api.demo;

import com.mimamori.api.group.GroupMemberRepository;
import com.mimamori.api.location.LocationRepository;
import com.mimamori.api.location.LocationService;
import com.mimamori.api.location.dto.LocationRequest;
import com.mimamori.api.notification.NotificationRepository;
import com.mimamori.api.sos.SosAlertRepository;
import com.mimamori.api.user.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * デモ用の家族を動かす（ポートフォリオ用）。
 *
 * <p>このアプリの見どころは「位置がひとりでに更新される」ことだが、見学者は 1人・1つのブラウザで開く。誰も動かなければ、地図はただの静止画に見えて
 * しまう。そこで「ママ」を実際に歩かせ、開いて数十秒で WebSocket の更新が 目に入るようにする。
 *
 * <p>⚠️ 既定は無効。本番（Railway）で環境変数 DEMO_MOVEMENT=true のときだけ 動く。開発機で勝手に走ると、自分の動作確認の位置履歴に混ざる。
 *
 * <p>⚠️ 位置の書き込みは LocationService.record に任せる。ジオフェンス判定・ 電池の通知・WebSocket 配信がすべてそこに入っているので、デモのためだけに
 * 同じ処理を書き写さない。
 */
@Component
@ConditionalOnProperty(name = "mimamori.demo.movement.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DemoMovementJob {

    /** 歩かせる人。V3__demo_data.sql で作られる */
    private static final String DEMO_EMAIL = "mama@example.com";

    /**
     * 自宅（大阪市西区境川）から学校（同 本田三丁目）までの経路。約970m。
     *
     * <p>⚠️ 座標も住所も国土地理院で実際に引いた値。それらしい住所を手で書くと、 地図に出る場所と住所が食い違う。
     *
     * <p>⚠️ 点の間隔（約51m）は送信間隔と釣り合わせてある。15秒で51mなら 時速12km、つまり自転車。粗い経路にすると時速26kmになり、子どもを
     * 送る母親の画面に「乗り物」と出てしまう。逆に細かくしすぎると ピンが動いて見えず、リアルタイムだと気づいてもらえない。
     */
    private static final List<Waypoint> ROUTE =
            List.of(
                    new Waypoint(34.669895, 135.471481, "大阪府大阪市西区境川一丁目"),
                    new Waypoint(34.670321, 135.471687, "大阪府大阪市西区境川一丁目"),
                    new Waypoint(34.670747, 135.471894, "大阪府大阪市西区九条南二丁目"),
                    new Waypoint(34.671173, 135.472100, "大阪府大阪市西区九条南二丁目"),
                    new Waypoint(34.671598, 135.472307, "大阪府大阪市西区九条南二丁目"),
                    new Waypoint(34.672024, 135.472513, "大阪府大阪市西区九条南二丁目"),
                    new Waypoint(34.672450, 135.472720, "大阪府大阪市西区九条南二丁目"),
                    new Waypoint(34.672876, 135.472926, "大阪府大阪市西区九条南二丁目"),
                    new Waypoint(34.673302, 135.473132, "大阪府大阪市西区九条南二丁目"),
                    new Waypoint(34.673728, 135.473339, "大阪府大阪市西区九条南二丁目"),
                    new Waypoint(34.674153, 135.473545, "大阪府大阪市西区九条一丁目"),
                    new Waypoint(34.674579, 135.473752, "大阪府大阪市西区九条一丁目"),
                    new Waypoint(34.675005, 135.473958, "大阪府大阪市西区九条一丁目"),
                    new Waypoint(34.675431, 135.474164, "大阪府大阪市西区九条二丁目"),
                    new Waypoint(34.675857, 135.474371, "大阪府大阪市西区九条二丁目"),
                    new Waypoint(34.676283, 135.474577, "大阪府大阪市西区九条二丁目"),
                    new Waypoint(34.676708, 135.474784, "大阪府大阪市西区九条二丁目"),
                    new Waypoint(34.677134, 135.474990, "大阪府大阪市西区本田三丁目"),
                    new Waypoint(34.677560, 135.475197, "大阪府大阪市西区本田三丁目"),
                    new Waypoint(34.677986, 135.475403, "大阪府大阪市西区本田三丁目"));

    /** 電池はここから1歩ごとに1%ずつ減り、下限に着いたら満充電に戻す */
    private static final int BATTERY_FULL = 90;

    private static final int BATTERY_EMPTY = 15;

    /** これより古いデモの記録は捨てる */
    private static final Duration KEEP = Duration.ofHours(2);

    private final UserRepository userRepository;
    private final LocationService locationService;
    private final LocationRepository locationRepository;
    private final NotificationRepository notificationRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final SosAlertRepository sosAlertRepository;

    /** 何歩目か。往復と電池残量の両方をこの1つの値から決める */
    private int step = 0;

    /**
     * 経路を1歩進める。
     *
     * <p>⚠️ 実利用者の送信間隔（30秒）より短くしてある。見学者が地図を開いて いる時間は短く、30秒に1回では「動いていない」と受け取られるため。
     */
    @Scheduled(fixedRateString = "${mimamori.demo.movement.interval-ms:15000}")
    public void move() {
        userRepository
                .findByEmail(DEMO_EMAIL)
                .ifPresentOrElse(
                        user -> {
                            Waypoint next = ROUTE.get(indexOf(step));

                            locationService.record(
                                    user.getId(),
                                    new LocationRequest(
                                            next.lat(),
                                            next.lng(),
                                            8.0f,
                                            (short) batteryOf(step),
                                            next.address()));
                            step++;
                        },
                        // デモデータが入っていない環境。止めるほどのことではない
                        () -> log.debug("デモ用アカウント {} が見つかりません", DEMO_EMAIL));
    }

    /**
     * 何歩目かを経路上の位置に直す。端に着いたら折り返す。
     *
     * <p>⚠️ 単純な剰余だと、学校に着いた次の瞬間に自宅へ瞬間移動する。 見た目が壊れるだけでなく、移動速度が異常な値になる。
     */
    private static int indexOf(int step) {
        int lap = ROUTE.size() * 2 - 2; // 往path + 復path（両端は重ねない）
        int position = step % lap;

        return position < ROUTE.size() ? position : lap - position;
    }

    /** 1歩ごとに1%減らし、空になったら満充電に戻す（F-08 の通知を見せる） */
    private static int batteryOf(int step) {
        int span = BATTERY_FULL - BATTERY_EMPTY;

        return BATTERY_FULL - (step % (span + 1));
    }

    /**
     * 古いデモの記録を捨てる。
     *
     * <p>⚠️ これが無いと、往復1周ごとに到着・出発の通知が4件たまり続ける。 数日でベルのバッジが桁違いの数字になり、無料枠のDBも埋まる。
     *
     * <p>⚠️ 消す対象はデモの家族に限る。実際の利用者の通知を巻き込まない。
     */
    @Scheduled(fixedRateString = "${mimamori.demo.movement.prune-ms:900000}")
    @Transactional
    public void prune() {
        userRepository
                .findByEmail(DEMO_EMAIL)
                .ifPresent(
                        demo -> {
                            Instant before = Instant.now().minus(KEEP);

                            locationRepository.deleteByUserIdAndRecordedAtBefore(
                                    demo.getId(), before);

                            // 通知の宛先は本人ではなく家族なので、そちらを消す
                            List<Long> family = groupMemberRepository.findRelatedUserIds(demo.getId());
                            if (!family.isEmpty()) {
                                notificationRepository.deleteByUserIdInAndCreatedAtBefore(
                                        family, before);
                            }

                            // ⚠️ 見学者が SOS を試したあとタブを閉じると、通報は
                            //   ACTIVE のまま残る。解除できるのは発信者だけなので、
                            //   次に開いた人が「進行中の緊急事態」から始まることになる。
                            //   デモに限り、古い通報は捨てる。
                            sosAlertRepository.deleteByTriggeredAtBefore(before);
                        });
    }

    /** 経路の1点。住所まで持つのは、端末が送ってくる値と形をそろえるため */
    private record Waypoint(double lat, double lng, String address) {}
}
