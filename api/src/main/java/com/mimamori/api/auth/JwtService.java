package com.mimamori.api.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** JWT の発行と検証。 */
@Service
@Slf4j
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    /** ログイン成功時に呼ぶ。 */
    public String issue(Long userId, String email) {
        Instant now = Instant.now();

        return Jwts.builder()
                // sub にはユーザーIDを入れる。メールは変更されうるので識別子に使わない
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.getExpiration())))
                .signWith(key)
                .compact();
    }

    /**
     * トークンからユーザーIDを取り出す。
     *
     * <p>署名が違う・期限切れ・壊れている場合はすべて null を返す。 ⚠️ 理由をクライアントに伝えない。「期限切れ」か「偽造」かが分かると 攻撃の手がかりになるため。
     */
    public Long extractUserId(String token) {
        try {
            Claims claims =
                    Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();

            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("無効なトークン: {}", e.getMessage());
            return null;
        }
    }
}
