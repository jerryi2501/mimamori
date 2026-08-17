package com.mimamori.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ⚠️ @EnableScheduling は呼び出しのタイムアウト判定（PingTimeoutJob）に要る。 これが無いと @Scheduled が黙って動かない — 例外も警告も出ない。
 */
@SpringBootApplication
@EnableScheduling
public class ApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }
}
