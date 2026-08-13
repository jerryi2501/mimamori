package com.mimamori.api.auth;

import com.mimamori.api.auth.dto.AuthResponse;
import com.mimamori.api.auth.dto.LoginRequest;
import com.mimamori.api.auth.dto.RegisterRequest;
import com.mimamori.api.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** SC-A02 新規登録 */
    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    /** SC-A01 ログイン */
    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * ログイン中の利用者。認証が効いているかの確認にも使う。
     *
     * <p>@AuthenticationPrincipal には JwtAuthFilter が入れた User がそのまま届く。
     */
    @GetMapping("/me")
    public AuthResponse me(@AuthenticationPrincipal User user) {
        return new AuthResponse(
                null, user.getId(), user.getName(), user.getEmail(), user.getAvatarColor());
    }
}
