package com.merigarage.reviews.service.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateReviewRequest(
        @JsonAlias("serviceQuality") @NotNull @Min(1) @Max(5) Byte ratingServiceQuality,
        @JsonAlias("pricing") @NotNull @Min(1) @Max(5) Byte ratingPricing,
        @JsonAlias("timeline") @NotNull @Min(1) @Max(5) Byte ratingTimeline,
        @JsonAlias("communication") @NotNull @Min(1) @Max(5) Byte ratingCommunication,
        @Size(max = 150) String reviewTitle,
        @NotBlank String reviewText
) {}
