package com.merigarage.reviews.security.oauth;

public interface GoogleTokenVerifier {
    GoogleTokenPayload verify(String credential);
}
