package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleAuthRequest(
        @NotBlank(message = "Google credential token is required.")
        String credential,
        String portal,
        @Size(max = 64) String sessionId,
        String role
) {
    public GoogleAuthRequest(String credential) {
        this(credential, null, null, null);
    }

    public GoogleAuthRequest(String credential, String portal) {
        this(credential, portal, null, null);
    }

    public GoogleAuthRequest(String credential, String portal, String sessionId) {
        this(credential, portal, sessionId, null);
    }
}
