package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.ReviewResponse;
import com.merigarage.reviews.domain.enums.ReviewStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserReviewDto(
        Long id,
        Long garageId,
        String garageName,
        String garageSlug,
        String garageCity,
        BigDecimal overallRating,
        Byte ratingServiceQuality,
        Byte ratingPricing,
        Byte ratingTimeline,
        Byte ratingCommunication,
        String reviewTitle,
        String reviewText,
        ReviewStatus status,
        ReviewResponseDto response,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static UserReviewDto fromEntity(Review review, ReviewResponse response) {
        if (review == null) return null;

        BigDecimal overall = review.getOverallRating();
        if (overall == null && review.getRatingServiceQuality() != null && review.getRatingPricing() != null &&
                review.getRatingTimeline() != null && review.getRatingCommunication() != null) {
            double avg = (review.getRatingServiceQuality() + review.getRatingPricing() +
                    review.getRatingTimeline() + review.getRatingCommunication()) / 4.0;
            overall = BigDecimal.valueOf(avg).setScale(2, java.math.RoundingMode.HALF_UP);
        }

        return new UserReviewDto(
                review.getId(),
                review.getGarage() != null ? review.getGarage().getId() : null,
                review.getGarage() != null ? review.getGarage().getName() : "Workshop",
                review.getGarage() != null ? review.getGarage().getSlug() : null,
                review.getGarage() != null ? review.getGarage().getCity() : null,
                overall,
                review.getRatingServiceQuality(),
                review.getRatingPricing(),
                review.getRatingTimeline(),
                review.getRatingCommunication(),
                review.getReviewTitle(),
                review.getReviewText(),
                review.getStatus(),
                ReviewResponseDto.fromEntity(response),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
