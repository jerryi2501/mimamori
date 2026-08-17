package com.mimamori.api.place;

import com.mimamori.api.group.GroupMemberRepository;
import com.mimamori.api.group.GroupRepository;
import com.mimamori.api.place.dto.PlaceEventResponse;
import com.mimamori.api.place.dto.PlaceRequest;
import com.mimamori.api.place.dto.PlaceResponse;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlaceService {

    /** ゾーン履歴の既定件数。無限に増える表なので必ず上限を置く */
    private static final int DEFAULT_EVENT_LIMIT = 20;

    private final PlaceRepository placeRepository;
    private final PlaceEventRepository placeEventRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    /** SC-P01 グループの場所一覧 */
    @Transactional(readOnly = true)
    public List<PlaceResponse> findByGroup(Long groupId, Long userId) {
        requireMember(groupId, userId);

        return placeRepository.findByGroupId(groupId).stream()
                .map(PlaceService::toResponse)
                .toList();
    }

    /** SC-P02 1件を読む（編集画面を開いたとき） */
    @Transactional(readOnly = true)
    public PlaceResponse findOne(Long placeId, Long userId) {
        return toResponse(requireAccessible(placeId, userId));
    }

    /** SC-P02 登録 */
    @Transactional
    public PlaceResponse create(Long groupId, Long userId, PlaceRequest request) {
        requireMember(groupId, userId);

        User me = userRepository.getReferenceById(userId);

        Place place =
                new Place(
                        groupRepository.getReferenceById(groupId),
                        request.name().trim(),
                        categoryOf(request),
                        request.lat(),
                        request.lng(),
                        request.radiusMeters(),
                        me);

        // 新規は有効。enabled を送ってきた場合だけ従う
        place.setEnabled(request.enabled() == null || request.enabled());

        return toResponse(placeRepository.save(place));
    }

    /** SC-P02 編集 */
    @Transactional
    public PlaceResponse update(Long placeId, Long userId, PlaceRequest request) {
        Place place = requireAccessible(placeId, userId);

        // ⚠️ 座標が動いたら住所は嘘になる。null に戻して、
        //    逆ジオコーディングをやり直させる（でっち上げない）
        if (place.getLat() != request.lat() || place.getLng() != request.lng()) {
            place.setAddress(null);
        }

        place.setName(request.name().trim());
        place.setCategory(categoryOf(request));
        place.setLat(request.lat());
        place.setLng(request.lng());
        place.setRadiusM(request.radiusMeters());

        if (request.enabled() != null) {
            place.setEnabled(request.enabled());
        }

        // save() は不要。@Transactional の中のエンティティはコミット時に自動で UPDATE される
        return toResponse(place);
    }

    /** SC-P02 削除。⚠️ place_events は ON DELETE CASCADE で一緒に消える */
    @Transactional
    public void delete(Long placeId, Long userId) {
        placeRepository.delete(requireAccessible(placeId, userId));
    }

    /** SC-P01 ゾーン履歴 */
    @Transactional(readOnly = true)
    public List<PlaceEventResponse> findEvents(Long groupId, Long userId, Integer limit) {
        requireMember(groupId, userId);

        int size = limit == null || limit <= 0 ? DEFAULT_EVENT_LIMIT : Math.min(limit, 100);

        return placeEventRepository.findRecentByGroupId(groupId, PageRequest.of(0, size)).stream()
                .map(PlaceService::toEventResponse)
                .toList();
    }

    /** 種類は省略できる。省略なら「その他」 */
    private static PlaceCategory categoryOf(PlaceRequest request) {
        return request.category() == null ? PlaceCategory.OTHER : request.category();
    }

    /** そのグループのメンバーか */
    private void requireMember(Long groupId, Long userId) {
        groupMemberRepository
                .findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(GroupNotAccessibleException::new);
    }

    /**
     * その場所を触ってよいか。
     *
     * <p>⚠️ 作成者だけに限定しない。家族の誰かが登録した「自宅」を他の家族が直せないと 使いものにならない。グループのメンバーなら編集できる、が企画書 F-06 の意図。
     */
    private Place requireAccessible(Long placeId, Long userId) {
        Place place =
                placeRepository.findById(placeId).orElseThrow(PlaceNotAccessibleException::new);

        requireMember(place.getGroup().getId(), userId);
        return place;
    }

    private static PlaceResponse toResponse(Place place) {
        return new PlaceResponse(
                place.getId(),
                place.getGroup().getId(),
                place.getName(),
                place.getCategory(),
                place.getLat(),
                place.getLng(),
                place.getRadiusM(),
                place.getAddress(),
                place.isEnabled());
    }

    private static PlaceEventResponse toEventResponse(PlaceEvent event) {
        return new PlaceEventResponse(
                event.getId(),
                event.getPlace().getId(),
                event.getPlace().getName(),
                event.getUser().getId(),
                event.getUser().getName(),
                event.getEventType(),
                event.getOccurredAt());
    }
}
