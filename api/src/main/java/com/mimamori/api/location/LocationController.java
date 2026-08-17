package com.mimamori.api.location;

import com.mimamori.api.location.dto.HistoryEventResponse;
import com.mimamori.api.location.dto.LocationRequest;
import com.mimamori.api.location.dto.LocationResponse;
import com.mimamori.api.user.User;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 位置（企画書 §7）。 */
@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    /**
     * 自分の現在地を送る。
     *
     * <p>⚠️ 誰の位置かは body ではなくトークンから決める。 userId を body で受けると、他人になりすまして 偽の位置を書き込めてしまう。
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LocationResponse record(
            @AuthenticationPrincipal User me, @Valid @RequestBody LocationRequest request) {
        return locationService.record(me.getId(), request);
    }

    /**
     * SC-M03 位置履歴。date を省略すると今日。
     *
     * <p>⚠️ 既定値を LocalDate.now() にするとサーバーの時計（UTC）で 判断され、日本の朝9時までずっと「昨日」になる。
     */
    @GetMapping("/{userId}/history")
    public List<HistoryEventResponse> history(
            @AuthenticationPrincipal User me,
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date) {

        LocalDate target = date != null ? date : LocalDate.now(ZoneId.of("Asia/Tokyo"));
        return locationService.findHistory(me.getId(), userId, target);
    }
}
