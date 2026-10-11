package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.DocumentVerificationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DocumentReviewRequest(
        @NotNull DocumentVerificationStatus status,
        @Size(max = 255) String rejectionReason
) {}
