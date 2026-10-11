package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.ReviewResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReviewDto(
        Long id,
        Long garageId,
        String authorFullName,
        Byte ratingServiceQuality,
        Byte ratingPricing,
        Byte ratingTimeline,
        Byte ratingCommunication,
        BigDecimal overallRating,
        String reviewTitle,
        String reviewText,
        ReviewResponseDto response,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ReviewDto fromEntity(Review review, ReviewResponse response) {
        BigDecimal overall = review.getOverallRating();
        if (overall == null && review.getRatingServiceQuality() != null && review.getRatingPricing() != null &&
                review.getRatingTimeline() != null && review.getRatingCommunication() != null) {
            double avg = (review.getRatingServiceQuality() + review.getRatingPricing() +
                    review.getRatingTimeline() + review.getRatingCommunication()) / 4.0;
            overall = BigDecimal.valueOf(avg).setScale(2, java.math.RoundingMode.HALF_UP);
        }
        return new ReviewDto(
                review.getId(),
                review.getGarage().getId(),
                review.getUser().getFullName(),
                review.getRatingServiceQuality(),
                review.getRatingPricing(),
                review.getRatingTimeline(),
                review.getRatingCommunication(),
                overall,
                review.getReviewTitle(),
                review.getReviewText(),
                ReviewResponseDto.fromEntity(response),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
