package com.mimamori.api.group;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<Group, Long> {

    /** 招待コードで参加するとき（SC-G01） */
    Optional<Group> findByInviteCode(String inviteCode);

    /** 招待コード生成時の衝突確認 */
    boolean existsByInviteCode(String inviteCode);
}
