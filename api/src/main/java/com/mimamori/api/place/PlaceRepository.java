package com.mimamori.api.place;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceRepository extends JpaRepository<Place, Long> {

    /** そのグループの場所一覧（SC-P01） */
    List<Place> findByGroupId(Long groupId);

    /** ジオフェンス判定に使う。位置を受け取るたびに全件と距離を比べるため、 無効にした場所は最初から除く（企画書 §5）。 */
    List<Place> findByGroupIdAndEnabledTrue(Long groupId);
}
