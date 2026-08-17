package com.mimamori.api.group;

import com.mimamori.api.group.dto.CreateGroupRequest;
import com.mimamori.api.group.dto.GroupMemberResponse;
import com.mimamori.api.group.dto.GroupResponse;
import com.mimamori.api.group.dto.JoinGroupRequest;
import com.mimamori.api.group.dto.ShareLocationRequest;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * グループ（サークル）。企画書 §7。
 *
 * <p>⚠️ 権限チェックはすべて GroupService 側に置く。ここに書くと、 あとで WebSocket から同じ処理を呼ぶときに素通しになる。
 */
@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    /** SC-G01 参加中のグループ一覧 */
    @GetMapping
    public List<GroupResponse> findMine(@AuthenticationPrincipal User me) {
        return groupService.findMine(me.getId());
    }

    /** SC-G02 グループ作成 */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(
            @AuthenticationPrincipal User me, @Valid @RequestBody CreateGroupRequest request) {
        return groupService.create(me.getId(), request.name());
    }

    /**
     * SC-G02 招待コードで参加。
     *
     * <p>⚠️ この行は「/{groupId}」より先に書く必要はない。HTTP メソッドが違う（POST と GET）ので衝突しない。 ただし React Router
     * と違い、Spring は「宣言順」ではなく 「より具体的なパターン」を選ぶ。/join のような固定文字列は {groupId} に必ず勝つ。
     */
    @PostMapping("/join")
    public GroupResponse join(
            @AuthenticationPrincipal User me, @Valid @RequestBody JoinGroupRequest request) {
        return groupService.join(me.getId(), request.code());
    }

    /** SC-G03 グループ詳細 */
    @GetMapping("/{groupId}")
    public GroupResponse findOne(@AuthenticationPrincipal User me, @PathVariable Long groupId) {
        return groupService.findOne(groupId, me.getId());
    }

    /** SC-G03 メンバー一覧。位置は Location API ができてから足す */
    @GetMapping("/{groupId}/members")
    public List<GroupMemberResponse> findMembers(
            @AuthenticationPrincipal User me, @PathVariable Long groupId) {
        return groupService.findMembers(groupId, me.getId());
    }

    /** F-03 位置共有 ON/OFF */
    @PutMapping("/{groupId}/share")
    public GroupResponse updateShare(
            @AuthenticationPrincipal User me,
            @PathVariable Long groupId,
            @Valid @RequestBody ShareLocationRequest request) {
        return groupService.updateShare(groupId, me.getId(), request.shareLocation());
    }

    /** SC-G03 グループごと削除する（オーナーのみ） */
    @DeleteMapping("/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(@AuthenticationPrincipal User me, @PathVariable Long groupId) {
        groupService.deleteGroup(groupId, me.getId());
    }

    /** SC-G03 自分が抜ける。/members/{userId} より具体的なので Spring はこちらを選ぶ */
    @DeleteMapping("/{groupId}/members/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@AuthenticationPrincipal User me, @PathVariable Long groupId) {
        groupService.leave(groupId, me.getId());
    }

    /** SC-G03 オーナーがメンバーを外す */
    @DeleteMapping("/{groupId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(
            @AuthenticationPrincipal User me,
            @PathVariable Long groupId,
            @PathVariable Long userId) {
        groupService.remove(groupId, userId, me.getId());
    }
}
