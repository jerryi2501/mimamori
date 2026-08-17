package com.mimamori.api.place;

import com.mimamori.api.place.dto.PlaceEventResponse;
import com.mimamori.api.place.dto.PlaceRequest;
import com.mimamori.api.place.dto.PlaceResponse;
import com.mimamori.api.user.User;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** セーフゾーン（F-06 / 企画書 §7）。 */
@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;

    /** SC-P01 グループの場所一覧 */
    @GetMapping
    public List<PlaceResponse> findByGroup(
            @AuthenticationPrincipal User me, @RequestParam Long groupId) {
        return placeService.findByGroup(groupId, me.getId());
    }

    /**
     * SC-P01 ゾーン履歴。
     *
     * <p>⚠️ この宣言は「/{placeId}」と衝突しない。Spring は宣言順ではなく 「より具体的なパターン」を選ぶので、固定文字列の /events が勝つ。
     * /members/me のときと同じ決まり。
     */
    @GetMapping("/events")
    public List<PlaceEventResponse> findEvents(
            @AuthenticationPrincipal User me,
            @RequestParam Long groupId,
            @RequestParam(required = false) Integer limit) {
        return placeService.findEvents(groupId, me.getId(), limit);
    }

    /** SC-P02 1件を読む */
    @GetMapping("/{placeId}")
    public PlaceResponse findOne(@AuthenticationPrincipal User me, @PathVariable Long placeId) {
        return placeService.findOne(placeId, me.getId());
    }

    /** SC-P02 登録 */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlaceResponse create(
            @AuthenticationPrincipal User me,
            @RequestParam Long groupId,
            @Valid @RequestBody PlaceRequest request) {
        return placeService.create(groupId, me.getId(), request);
    }

    /** SC-P02 編集 */
    @PutMapping("/{placeId}")
    public PlaceResponse update(
            @AuthenticationPrincipal User me,
            @PathVariable Long placeId,
            @Valid @RequestBody PlaceRequest request) {
        return placeService.update(placeId, me.getId(), request);
    }

    /** SC-P02 削除 */
    @DeleteMapping("/{placeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User me, @PathVariable Long placeId) {
        placeService.delete(placeId, me.getId());
    }
}
