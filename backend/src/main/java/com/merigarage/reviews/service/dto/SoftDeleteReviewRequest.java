package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SoftDeleteReviewRequest(
        @NotBlank @Size(max = 255) String deletionReason
) {}
