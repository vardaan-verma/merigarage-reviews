package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        String portal,
        @Size(max = 64) String sessionId
) {
    public LoginRequest(String email, String password) {
        this(email, password, null, null);
    }

    public LoginRequest(String email, String password, String portal) {
        this(email, password, portal, null);
    }
}
