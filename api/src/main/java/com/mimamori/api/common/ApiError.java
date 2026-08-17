package com.mimamori.api.common;

/**
 * 画面に返すエラーの形。
 *
 * <p>frontend の client.js が err.response.data.message を読むので、 キー名は message で固定する。
 */
public record ApiError(String message) {}
