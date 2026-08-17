package com.mimamori.api.group;

import java.security.SecureRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 招待コードを作る。frontend の mockApi.randomCode() と同じ規則。 */
@Component
@RequiredArgsConstructor
public class InviteCodeGenerator {

    /** ⚠️ 紛らわしい文字（0/O・1/I/L）を入れない。コードは電話口で読み上げられる */
    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    private static final int MAX_ATTEMPTS = 10;

    private final GroupRepository groupRepository;

    // ⚠️ Random ではなく SecureRandom。Random は種を推測でき、
    //    他人の招待コードを言い当てられる可能性がある
    // ⚠️ この行は @RequiredArgsConstructor の引数にならない。
    //    Lombok は「final かつ未初期化」のフィールドだけを対象にする
    private final SecureRandom random = new SecureRandom();

    public String generate() {
        // groups.invite_code は UNIQUE。衝突したら作り直す
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String code = pick(3) + "-" + pick(3);

            if (!groupRepository.existsByInviteCode(code)) {
                return code;
            }
        }
        // 31^6 通りあるので現実には起きない。無限ループにはしない
        throw new IllegalStateException("招待コードを生成できませんでした");
    }

    private String pick(int length) {
        StringBuilder builder = new StringBuilder(length);

        for (int i = 0; i < length; i++) {
            builder.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        return builder.toString();
    }
}
