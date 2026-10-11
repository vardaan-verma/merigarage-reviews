package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReviewRequest(
        @NotNull @Min(1) @Max(5) Byte ratingServiceQuality,
        @NotNull @Min(1) @Max(5) Byte ratingPricing,
        @NotNull @Min(1) @Max(5) Byte ratingTimeline,
        @NotNull @Min(1) @Max(5) Byte ratingCommunication,
        @Size(max = 150) String reviewTitle,
        @NotBlank String reviewText
) {}
