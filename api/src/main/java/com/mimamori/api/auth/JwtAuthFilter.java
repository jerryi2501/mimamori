package com.mimamori.api.auth;

import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authorization ヘッダーの Bearer トークンを見て、認証済みかどうかを決める。
 *
 * <p>OncePerRequestFilter を継承するのは、forward などで1リクエスト中に 複数回呼ばれるのを防ぐため。
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        String token = extractToken(request);

        // ⚠️ 認証できなくてもここでは弾かない。素通しして先へ進める。
        //    「誰も認証されていない」状態で SecurityConfig の認可設定に判断させる。
        //    ここで 401 を返すと、ログイン画面のような公開APIまで塞いでしまう。
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            Long userId = jwtService.extractUserId(token);

            if (userId != null) {
                // ⚠️ 毎リクエストで1回 DB を引く。その代わり、退会した利用者の
                //    トークンが期限まで有効に残る問題を避けられる
                userRepository.findById(userId).ifPresent(this::authenticate);
            }
        }

        chain.doFilter(request, response);
    }

    private void authenticate(User user) {
        var authentication = new UsernamePasswordAuthenticationToken(user, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith(PREFIX)) {
            return null;
        }
        return header.substring(PREFIX.length());
    }
}
