package com.mimamori.api.location.dto;

import com.mimamori.api.location.Movement;
import java.time.Instant;

/**
 * 位置が動いたことを同じグループへ配る中身（企画書 §6）。
 *
 * <p>⚠️ メンバー一覧（GroupMemberResponse）の「位置の部分」と同じ項目にそろえる。 画面は userId で突き合わせて上書きするだけでよく、名前や役割は変わらないので
 * 送らない。
 *
 * <p>⚠️ 共有オフのグループには配らない（送る側で除外する）。この形に 座標が入っている時点で「見せてよい相手」だけに届いている前提。
 */
public record LocationBroadcast(
        Long userId,
        double lat,
        double lng,
        Short batteryLevel,
        String address,
        Instant lastUpdatedAt,
        Movement movement,
        Integer speedKmh,
        boolean moving,
        String placeName) {}
