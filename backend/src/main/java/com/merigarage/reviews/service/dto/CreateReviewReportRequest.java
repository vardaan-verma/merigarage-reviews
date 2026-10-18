package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReviewReportRequest(
        @NotBlank @Size(max = 100) String reportReason,
        @Size(max = 1000) String details
) {
}
