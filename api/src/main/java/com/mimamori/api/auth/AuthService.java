package com.mimamori.api.auth;

import com.mimamori.api.auth.dto.AuthResponse;
import com.mimamori.api.auth.dto.LoginRequest;
import com.mimamori.api.auth.dto.RegisterRequest;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalize(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyUsedException();
        }

        User user =
                userRepository.save(
                        new User(
                                email, passwordEncoder.encode(request.password()), request.name()));

        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user =
                userRepository
                        .findByEmail(normalize(request.email()))
                        .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return toResponse(user);
    }

    /** 大文字小文字と前後の空白でログインできなくなるのを防ぐ */
    private String normalize(String email) {
        return email.trim().toLowerCase();
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(
                jwtService.issue(user.getId(), user.getEmail()),
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarColor());
    }
}
