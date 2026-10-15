package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank(message = "Google credential token is required.")
        String credential
) {}
