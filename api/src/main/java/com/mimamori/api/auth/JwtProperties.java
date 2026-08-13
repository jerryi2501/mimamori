package com.mimamori.api.auth;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** application.properties の mimamori.jwt.* を読む。 */
@Component
@ConfigurationProperties(prefix = "mimamori.jwt")
@Getter
@Setter
public class JwtProperties {

    /** HS256 の署名鍵。32文字（256bit）以上が必要 */
    private String secret;

    /** 有効期限。PT24H のような ISO-8601 形式 */
    private Duration expiration = Duration.ofHours(24);

    /**
     * ⚠️ 起動時に検証して、設定が無ければその場で落とす。
     *
     * <p>秘密鍵が空のまま動いてしまうと、誰でもトークンを偽造できる状態で 本番に出てしまう。「動くが安全でない」より「動かない」ほうがましなので、 起動を止める。
     */
    @PostConstruct
    void validate() {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                    "mimamori.jwt.secret が未設定か短すぎます（32文字以上必要）。" + " 環境変数 JWT_SECRET を設定してください。");
        }
    }
}
