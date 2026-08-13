package com.mimamori.api.place;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceEventRepository extends JpaRepository<PlaceEvent, Long> {

    /**
     * グループのゾーン履歴（SC-P01 の下部）。新しい順。
     *
     * <p>アンダースコアは「関連をたどる」印。Place_Group_Id は placeEvent.place.group.id を意味する。
     *
     * <p>Pageable で件数を絞る。履歴は無限に増えるので全件返さない。
     */
    List<PlaceEvent> findByPlace_Group_IdOrderByOccurredAtDesc(Long groupId, Pageable pageable);
}
