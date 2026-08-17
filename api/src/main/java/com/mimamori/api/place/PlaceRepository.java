package com.mimamori.api.place;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlaceRepository extends JpaRepository<Place, Long> {

    /** そのグループの場所一覧（SC-P01） */
    List<Place> findByGroupId(Long groupId);

    /** ジオフェンス判定に使う。位置を受け取るたびに全件と距離を比べるため、 無効にした場所は最初から除く（企画書 §5）。 */
    List<Place> findByGroupIdAndEnabledTrue(Long groupId);

    /**
     * その人が属する全グループの、有効な場所（F-06 のジオフェンス判定用）。
     *
     * <p>⚠️ 位置は1件しか届かないが、人は複数のグループに入れる。 「家族」の自宅と「バイト先」の職場は別グループの場所なので、 まとめて判定しないと片方の到着通知が出ない。
     */
    @Query(
            """
            select p from Place p
            where p.enabled = true
              and p.group.id in (
                  select gm.group.id from GroupMember gm where gm.user.id = :userId)
            """)
    List<Place> findEnabledForUser(@Param("userId") Long userId);

    /**
     * viewer と target が「同じグループに居る」場合の、そのグループの有効な場所。
     *
     * <p>位置履歴（SC-M03）で滞在先の名前を出すのに使う。
     *
     * <p>⚠️ target の全グループを使ってはいけない。viewer が入っていないグループの 場所の名前（「バイト先」など）まで見えてしまう。
     */
    @Query(
            """
            select p from Place p
            where p.enabled = true
              and p.group.id in (
                  select mine.group.id from GroupMember mine where mine.user.id = :viewerId)
              and p.group.id in (
                  select theirs.group.id from GroupMember theirs
                  where theirs.user.id = :targetUserId)
            """)
    List<Place> findSharedEnabled(
            @Param("viewerId") Long viewerId, @Param("targetUserId") Long targetUserId);
}
