package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.QuoteRequestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminQuoteStatusUpdateRequest(
        @NotNull(message = "New quote status is required")
        QuoteRequestStatus status,

        @NotBlank(message = "Administrative notes/reason are required")
        @Size(max = 500, message = "Reason cannot exceed 500 characters")
        String reason
) {
}
