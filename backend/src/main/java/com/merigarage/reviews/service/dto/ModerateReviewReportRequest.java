package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ModerateReviewReportRequest(
        @NotBlank String action, // DISMISS, HIDE_REVIEW, DELETE_REVIEW
        @Size(max = 255) String decisionNotes
) {
}
