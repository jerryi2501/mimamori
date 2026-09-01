package com.mimamori.api.group;

import com.mimamori.api.group.dto.GroupMemberResponse;
import com.mimamori.api.group.dto.GroupResponse;
import com.mimamori.api.location.Location;
import com.mimamori.api.location.LocationService;
import com.mimamori.api.location.Movement;
import com.mimamori.api.location.MovementEstimate;
import com.mimamori.api.notification.NotificationService;
import com.mimamori.api.notification.NotificationType;
import com.mimamori.api.place.GeofenceService;
import com.mimamori.api.place.Place;
import com.mimamori.api.place.PlaceRepository;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final InviteCodeGenerator inviteCodeGenerator;
    private final LocationService locationService;
    private final PlaceRepository placeRepository;
    private final NotificationService notificationService;

    /** SC-G02 グループ作成。作った本人が OWNER になる */
    @Transactional
    public GroupResponse create(Long userId, String name) {
        // ⚠️ getReferenceById は SELECT を投げない。外部キーに入れる id しか
        //    使わないので、実体を読む必要がない
        User me = userRepository.getReferenceById(userId);

        Group group =
                groupRepository.save(new Group(name.trim(), inviteCodeGenerator.generate(), me));

        GroupMember member =
                groupMemberRepository.save(new GroupMember(group, me, GroupRole.OWNER));

        return toResponse(group, member, 1);
    }

    /** SC-G01 参加中のグループ一覧 */
    @Transactional(readOnly = true)
    public List<GroupResponse> findMine(Long userId) {
        return groupMemberRepository.findByUserIdWithGroup(userId).stream()
                // ⚠️ ここは1グループにつき count が1回走る。
                //    人が入れるグループは数個なので今は許容する。
                //    メンバー一覧まで返すようになったら1本のクエリにまとめる
                .map(member -> toResponse(member.getGroup(), member, countMembers(member)))
                .toList();
    }

    /** SC-G03 グループ詳細 */
    @Transactional(readOnly = true)
    public GroupResponse findOne(Long groupId, Long userId) {
        GroupMember me = requireMember(groupId, userId);
        return toResponse(me.getGroup(), me, countMembers(me));
    }

    /** SC-M01 / SC-G03 メンバーと最新位置 */
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> findMembers(Long groupId, Long userId) {
        // ⚠️ 先に権限を見る。他人のグループのメンバーを覗けてはいけない
        requireMember(groupId, userId);

        List<GroupMember> members = groupMemberRepository.findByGroupIdWithUser(groupId);

        Map<Long, List<Location>> recent =
                locationService.findRecentByUsers(
                        members.stream().map(member -> member.getUser().getId()).toList());

        // 「自宅にいます」と出すための材料。1グループぶんを1回だけ読む
        List<Place> places = placeRepository.findByGroupIdAndEnabledTrue(groupId);

        return members.stream()
                .map(
                        member ->
                                toMemberResponse(
                                        member, recent.get(member.getUser().getId()), places))
                .toList();
    }

    /** SC-G02 招待コードで参加 */
    @Transactional
    public GroupResponse join(Long userId, String code) {
        // ⚠️ 画面の入力欄は uppercase 表示だが、実際の値は小文字のまま
        //    送られてくる。サーバー側でも必ず正規化する
        String normalized = code.trim().toUpperCase();

        Group group =
                groupRepository
                        .findByInviteCode(normalized)
                        .orElseThrow(InviteCodeNotFoundException::new);

        if (groupMemberRepository.findByGroupIdAndUserId(group.getId(), userId).isPresent()) {
            throw new AlreadyJoinedException();
        }

        GroupMember member =
                groupMemberRepository.save(
                        new GroupMember(
                                group, userRepository.getReferenceById(userId), GroupRole.MEMBER));

        // ⚠️ 宛先は「前からいた人」。findMemberIdsExcept は自分を除くので、
        //    保存したあとに呼んでも新入りに自分の参加通知は届かない
        notificationService.notifyGroupEvent(
                groupMemberRepository.findMemberIdsExcept(group.getId(), userId),
                loadUser(userId),
                group.getName(),
                NotificationType.MEMBER_JOINED);

        return toResponse(group, member, (int) groupMemberRepository.countByGroupId(group.getId()));
    }

    /** SC-G03 自分が抜ける */
    @Transactional
    public void leave(Long groupId, Long userId) {
        GroupMember me = requireMember(groupId, userId);

        if (me.getRole() == GroupRole.OWNER) {
            throw new OwnerCannotLeaveException();
        }

        // ⚠️ 宛先とグループ名は消す前に取る。delete したあとでは
        //    自分がメンバーでなくなり、グループも辿りにくくなる
        List<Long> others = groupMemberRepository.findMemberIdsExcept(groupId, userId);
        String groupName = me.getGroup().getName();

        groupMemberRepository.delete(me);

        notificationService.notifyGroupEvent(
                others, loadUser(userId), groupName, NotificationType.MEMBER_LEFT);
    }

    /**
     * SC-G03 グループごと削除する。オーナーだけ。
     *
     * <p>⚠️ これが無いとオーナーは詰む。脱退は 409 で断られ、グループを畳む手段が 無くなるため（企画書 §7 に追記した）。
     *
     * <p>⚠️ members / places / place_events は DB の ON DELETE CASCADE で一緒に消える。 位置履歴（locations）は
     * users にぶら下がっているので残る。
     */
    @Transactional
    public void deleteGroup(Long groupId, Long userId) {
        GroupMember me = requireMember(groupId, userId);

        if (me.getRole() != GroupRole.OWNER) {
            throw new NotGroupOwnerException();
        }

        // ⚠️ 必ず消す前に集める。削除後は group_members ごと CASCADE で
        //    消えていて、誰に知らせるべきかを二度と辿れない
        List<Long> others = groupMemberRepository.findMemberIdsExcept(groupId, userId);
        String groupName = me.getGroup().getName();

        groupRepository.delete(me.getGroup());

        // ⚠️ グループが消えたあとも文章に名前が要るので、payload に名前を残す
        notificationService.notifyGroupEvent(
                others, loadUser(userId), groupName, NotificationType.GROUP_DELETED);
    }

    /** SC-G03 オーナーが他人を外す */
    @Transactional
    public void remove(Long groupId, Long targetUserId, Long requesterId) {
        GroupMember requester = requireMember(groupId, requesterId);

        if (requester.getRole() != GroupRole.OWNER) {
            throw new NotGroupOwnerException();
        }
        // オーナーが自分を外すのも「脱退」と同じなので塞ぐ
        if (targetUserId.equals(requesterId)) {
            throw new OwnerCannotLeaveException();
        }

        GroupMember target =
                groupMemberRepository
                        .findByGroupIdAndUserId(groupId, targetUserId)
                        .orElseThrow(NotGroupMemberException::new);

        List<Long> others = groupMemberRepository.findMemberIdsExcept(groupId, targetUserId);
        String groupName = target.getGroup().getName();

        groupMemberRepository.delete(target);

        User removed = loadUser(targetUserId);

        // 残った人には「誰が外れたか」
        notificationService.notifyGroupEvent(
                others, removed, groupName, NotificationType.MEMBER_REMOVED);

        // ⚠️ 外された本人にも知らせる。黙って消えると、相手からは
        //    アプリが壊れたようにしか見えない（企画書 §1 の「同意の上で」）
        notificationService.notifyGroupEvent(
                List.of(targetUserId), removed, groupName, NotificationType.MEMBER_REMOVED);
    }

    /** F-03 このグループへの位置共有を切り替える */
    @Transactional
    public GroupResponse updateShare(Long groupId, Long userId, boolean shareLocation) {
        GroupMember me = requireMember(groupId, userId);
        me.setShareLocation(shareLocation);

        // ⚠️ save() は呼ばなくてよい。@Transactional の中で読んだエンティティは
        //    JPA の管理下にあり、コミット時に差分が自動で UPDATE される
        //    （ダーティチェック）。呼んでも害はないが、無くても動く理由を知っておく

        // ⚠️ 知らせる先はオーナーだけ。全員に配ると「誰が共有を切ったか」が
        //    家族中に流れ、見守るアプリではなく見張るアプリになる。
        // ⚠️ 自分がオーナーなら送らない。自分の操作を自分に通知しても意味がない
        groupMemberRepository
                .findOwnerId(groupId)
                .filter(ownerId -> !ownerId.equals(userId))
                .ifPresent(
                        ownerId ->
                                notificationService.notifyShareChanged(
                                        ownerId,
                                        loadUser(userId),
                                        me.getGroup().getName(),
                                        shareLocation));

        return toResponse(me.getGroup(), me, countMembers(me));
    }

    /**
     * 通知に載せる名前と色のために実体を読む。
     *
     * <p>⚠️ getReferenceById では駄目。proxy のまま payload に入れると、名前も色も 取り出せないまま通知が空になる。
     */
    private User loadUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(NotGroupMemberException::new);
    }

    /** 「この人はこのグループのメンバーか？」— 全APIの入口で必ず通す */
    private GroupMember requireMember(Long groupId, Long userId) {
        return groupMemberRepository
                .findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(NotGroupMemberException::new);
    }

    private int countMembers(GroupMember member) {
        return (int) groupMemberRepository.countByGroupId(member.getGroup().getId());
    }

    private static GroupResponse toResponse(Group group, GroupMember me, int memberCount) {
        return new GroupResponse(
                group.getId(),
                group.getName(),
                group.getInviteCode(),
                me.getRole(),
                me.isShareLocation(),
                memberCount,
                group.getCreatedAt());
    }

    /**
     * @param recent 最新→ひとつ前 の順。位置が1件も無ければ null
     * @param places このグループの有効なセーフゾーン。「自宅」などの表示に使う
     */
    private static GroupMemberResponse toMemberResponse(
            GroupMember member, List<Location> recent, List<Place> places) {
        User user = member.getUser();

        // ⚠️ 共有オフの人は座標・電池・住所を「返さない」。
        //    DTO に入れてから画面で隠す作りにすると、通信を覗くだけで
        //    位置が見えてしまう。隠すのはサーバーの仕事
        if (!member.isShareLocation() || recent == null || recent.isEmpty()) {
            return new GroupMemberResponse(
                    user.getId(),
                    user.getName(),
                    user.getAvatarColor(),
                    member.getRole(),
                    member.isShareLocation(),
                    member.getJoinedAt(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    false,
                    null);
        }

        Location latest = recent.get(0);
        Location previous = recent.size() > 1 ? recent.get(1) : null;
        MovementEstimate estimate = MovementEstimate.of(previous, latest);

        return new GroupMemberResponse(
                user.getId(),
                user.getName(),
                user.getAvatarColor(),
                member.getRole(),
                member.isShareLocation(),
                member.getJoinedAt(),
                latest.getLat(),
                latest.getLng(),
                latest.getBatteryLevel(),
                latest.getAddress(),
                latest.getRecordedAt(),
                estimate.movement(),
                estimate.speedKmh(),
                estimate.movement() != Movement.STILL,
                GeofenceService.nameOfContaining(places, latest.getLat(), latest.getLng()));
    }
}
