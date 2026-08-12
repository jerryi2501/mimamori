package com.mimamori.api.group;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

    /** 自分が参加中のグループ一覧（SC-G01） */
    List<GroupMember> findByUserId(Long userId);

    /** グループのメンバー一覧（SC-G03） */
    List<GroupMember> findByGroupId(Long groupId);

    /** 権限チェック用。「この人はこのグループのメンバーか？」 */
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
}
