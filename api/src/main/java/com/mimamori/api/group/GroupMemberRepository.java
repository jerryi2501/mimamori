package com.mimamori.api.group;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

    /** 自分が参加中のグループ一覧（SC-G01） */
    List<GroupMember> findByUserId(Long userId);

    /** グループのメンバー一覧（SC-G03） */
    List<GroupMember> findByGroupId(Long groupId);

    /** 権限チェック用。「この人はこのグループのメンバーか？」 */
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);

    /**
     * 自分の参加グループ一覧（SC-G01）。
     *
     * <p>⚠️ join fetch を書く理由: これが無いと、返ってきた行ごとに getGroup().getName() で SELECT が1回ずつ飛ぶ（N+1問題）。
     * エンティティ側で fetch = LAZY にしただけでは防げない。 LAZY は「読む時まで遅らせる」だけで、読めば結局は飛ぶ。
     */
    @Query(
            "select gm from GroupMember gm join fetch gm.group"
                    + " where gm.user.id = :userId order by gm.joinedAt")
    List<GroupMember> findByUserIdWithGroup(@Param("userId") Long userId);

    /**
     * グループのメンバー一覧（SC-G03）。
     *
     * <p>⚠️ where の gm.user.id は join を増やさない。 外部キー group_members.user_id を見るだけで済むため。 join fetch
     * が要るのは、名前や色を「読む」側だけ。
     */
    @Query(
            "select gm from GroupMember gm join fetch gm.user"
                    + " where gm.group.id = :groupId order by gm.joinedAt")
    List<GroupMember> findByGroupIdWithUser(@Param("groupId") Long groupId);

    /** メンバー数（SC-G01 のカードに出す「メンバー N人」） */
    long countByGroupId(Long groupId);

    /**
     * そのグループの、本人以外のメンバーの userId（通知の宛先）。
     *
     * <p>⚠️ 本人を外す。自分が家に着いたことを自分に知らせても意味がない。
     */
    @Query(
            """
            select gm.user.id from GroupMember gm
            where gm.group.id = :groupId and gm.user.id <> :exceptUserId
            """)
    List<Long> findMemberIdsExcept(
            @Param("groupId") Long groupId, @Param("exceptUserId") Long exceptUserId);

    /**
     * その人と1つでも同じグループに居る人の userId（本人は含まない）。
     *
     * <p>電池切れのように「グループに属さない出来事」を知らせる宛先に使う。
     *
     * <p>⚠️ distinct が要る。2つのグループで一緒の人が居ると、同じ相手に 通知が2件届いてしまう。
     */
    @Query(
            """
            select distinct gm.user.id from GroupMember gm
            where gm.user.id <> :userId
              and gm.group.id in (
                  select mine.group.id from GroupMember mine where mine.user.id = :userId)
            """)
    List<Long> findRelatedUserIds(@Param("userId") Long userId);

    /**
     * 「viewer は target の位置を見てよいか？」
     *
     * <p>同じグループに居て、かつ target がそのグループで共有をオンに していれば true。複数グループに同時に入れる仕様なので、 1つでも条件を満たすグループがあれば見てよい。
     */
    @Query(
            """
            select count(target) > 0 from GroupMember target
            where target.user.id = :targetUserId
              and target.shareLocation = true
              and target.group.id in (
                  select viewer.group.id from GroupMember viewer
                  where viewer.user.id = :viewerId)
            """)
    boolean canViewLocationOf(
            @Param("viewerId") Long viewerId, @Param("targetUserId") Long targetUserId);
}
