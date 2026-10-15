package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;

public record QuoteMessageRequest(
        @NotBlank(message = "Message text cannot be empty")
        String messageText
) {}
