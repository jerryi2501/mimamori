package com.mimamori.api.place;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlaceEventRepository extends JpaRepository<PlaceEvent, Long> {

    /**
     * グループのゾーン履歴（SC-P01 の下部）。新しい順。
     *
     * <p>アンダースコアは「関連をたどる」印。Place_Group_Id は placeEvent.place.group.id を意味する。
     *
     * <p>Pageable で件数を絞る。履歴は無限に増えるので全件返さない。
     *
     * <p>⚠️ join fetch を付ける。画面は場所の名前と人の名前を出すので、 これが無いと1行ごとに places と users へ SELECT が飛ぶ。
     */
    @Query(
            """
            select pe from PlaceEvent pe
            join fetch pe.place p
            join fetch pe.user
            where p.group.id = :groupId
            order by pe.occurredAt desc
            """)
    List<PlaceEvent> findRecentByGroupId(@Param("groupId") Long groupId, Pageable pageable);

    /**
     * 「その人はこの場所に、今いる事になっているか」を判断するための直近1件。
     *
     * <p>ARRIVE が最後なら中に居る扱い、LEAVE なら外。記録が無ければ外。
     *
     * <p>⚠️ 座標だけで判断すると、同じ到着を何度も記録してしまう。 直前に記録した状態と比べて、変わったときだけ書く。
     */
    Optional<PlaceEvent> findFirstByPlaceIdAndUserIdOrderByOccurredAtDesc(
            Long placeId, Long userId);
}
