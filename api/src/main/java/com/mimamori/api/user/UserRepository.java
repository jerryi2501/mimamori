package com.mimamori.api.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** メソッド名から SQL が自動生成される（Spring Data JPA）。 findByEmail → SELECT * FROM users WHERE email = ? */
public interface UserRepository extends JpaRepository<User, Long> {

    /** ログイン時に使う。⚠️ 見つからないことは普通なので Optional で返す */
    Optional<User> findByEmail(String email);

    /** 新規登録の重複チェック。件数だけ見るので User を取り出すより速い */
    boolean existsByEmail(String email);
}
