package com.mimamori.api.sos;

/** SOS の状態。DB は sos_alerts.status */
public enum SosStatus {
    /** 発信中 */
    ACTIVE,
    /** 解除済み */
    RESOLVED
}
