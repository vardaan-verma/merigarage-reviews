package com.merigarage.reviews.security.oauth;

public record GoogleTokenPayload(
        String sub,
        String email,
        boolean emailVerified,
        String name,
        String picture,
        String aud,
        String iss
) {}
