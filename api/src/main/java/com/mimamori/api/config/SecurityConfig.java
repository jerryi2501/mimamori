package com.mimamori.api.config;

import com.mimamori.api.auth.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${mimamori.cors.allowed-origins}")
    private String[] allowedOrigins;

    /**
     * パスワードは BCrypt で保存する。
     *
     * <p>BCrypt は「わざと遅い」ハッシュ。総当たり攻撃に時間をかけさせるのが目的で、 SHA-256 のような速いハッシュをパスワードに使ってはいけない。
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // ⚠️ CSRF を切ってよいのは、認証をCookieでなくBearerヘッダーで
                //    行うため。ブラウザが勝手に付けるものが無いので CSRF が成立しない
                .csrf(csrf -> csrf.disable())
                // ⚠️ セッションを持たない。トークンだけで判断するので
                //    サーバー側に状態を残さない（複数インスタンスに増やせる）
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        auth ->
                                auth
                                        // 認証なしで通すもの
                                        .requestMatchers("/api/auth/**")
                                        .permitAll()
                                        .requestMatchers("/actuator/health")
                                        .permitAll()
                                        // ⚠️ WebSocket のハンドシェイクだけ通す。
                                        //    ブラウザの WebSocket API は独自ヘッダーを
                                        //    付けられないので、ここで Bearer を要求すると
                                        //    そもそも繋げない。本人確認は接続後の
                                        //    STOMP CONNECT フレームで
                                        //    StompAuthInterceptor が行う
                                        .requestMatchers("/ws/**")
                                        .permitAll()
                                        // ⚠️ /error を必ず通す。
                                        //    例外が起きると Spring MVC は /error へ
                                        //    フォワードするが、そこも認可の対象になる。
                                        //    塞いだままだと、入力エラーの 400 が
                                        //    「/error にアクセスできない」= 403 に
                                        //    すり替わり、原因が分からなくなる
                                        .requestMatchers("/error")
                                        .permitAll()
                                        // CORS の事前確認は必ず通す
                                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                                        .permitAll()
                                        // ⚠️ それ以外はすべて要認証。
                                        //    「許可するものを列挙する」向きにする。
                                        //    逆にすると、新しいAPIを作るたびに
                                        //    守り忘れる危険がある
                                        .anyRequest()
                                        .authenticated())
                // ⚠️ 未認証は 401 を返す。
                //    formLogin も httpBasic も使わない構成では、Spring Security の
                //    既定の入口が Http403ForbiddenEntryPoint になり、
                //    「未ログイン」も 403 で返ってしまう。
                //    フロントは 401（トークンが無効→ログイン画面へ）と
                //    403（ログイン済みだが権限が無い）を区別する必要がある。
                //
                // ⚠️ sendError ではなく本文を自分で書く。sendError だと Spring の
                //    既定のエラー本文になり、message が英語の
                //    "No message available" のまま画面に出る。
                //    GlobalExceptionHandler はここまで届かない（例外ではなく
                //    フィルタチェーンの中で処理が終わるため）。
                .exceptionHandling(
                        ex ->
                                ex.authenticationEntryPoint(
                                        (request, response, authException) -> {
                                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                            response.setContentType("application/json");
                                            response.setCharacterEncoding("UTF-8");
                                            response.getWriter()
                                                    .write("{\"message\":\"ログインが必要です\"}");
                                        }))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        // Cookie を使わないので false。true にすると
        // allowedOrigins に "*" が使えなくなるなど制約が増える
        config.setAllowCredentials(false);

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
