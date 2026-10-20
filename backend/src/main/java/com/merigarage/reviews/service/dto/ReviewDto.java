package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.ReviewResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReviewDto(
        Long id,
        Long garageId,
        Long authorUserId,
        String authorFullName,
        String authorProfilePhotoUrl,
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
    public ReviewDto(
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
        this(id, garageId, null, authorFullName, null, ratingServiceQuality, ratingPricing, ratingTimeline, ratingCommunication, overallRating, reviewTitle, reviewText, response, createdAt, updatedAt);
    }

    public ReviewDto(
            Long id,
            Long garageId,
            Long authorUserId,
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
        this(id, garageId, authorUserId, authorFullName, null, ratingServiceQuality, ratingPricing, ratingTimeline, ratingCommunication, overallRating, reviewTitle, reviewText, response, createdAt, updatedAt);
    }

    public static ReviewDto fromEntity(Review review, ReviewResponse response) {
        BigDecimal overall = null;
        if (review.getRatingServiceQuality() != null && review.getRatingPricing() != null &&
                review.getRatingTimeline() != null && review.getRatingCommunication() != null) {
            double avg = (review.getRatingServiceQuality() + review.getRatingPricing() +
                    review.getRatingTimeline() + review.getRatingCommunication()) / 4.0;
            overall = BigDecimal.valueOf(avg).setScale(2, java.math.RoundingMode.HALF_UP);
        } else {
            overall = review.getOverallRating();
        }

        String authorPhoto = review.getUser() != null ? review.getUser().getProfilePhotoUrl() : null;
        if (authorPhoto == null && review.getUser() != null && review.getUser().getProfilePhotoStorageKey() != null) {
            authorPhoto = "/api/users/" + review.getUser().getId() + "/photo";
        }

        return new ReviewDto(
                review.getId(),
                review.getGarage().getId(),
                review.getUser() != null ? review.getUser().getId() : null,
                review.getUser() != null ? review.getUser().getFullName() : "Anonymous",
                authorPhoto,
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
