package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.ReviewReport;
import com.merigarage.reviews.domain.enums.ReviewReportStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReviewReportDto(
        Long id,
        Long reviewId,
        Long garageId,
        String garageName,
        String garageCity,
        Long authorUserId,
        String authorFullName,
        String authorEmail,
        BigDecimal overallRating,
        String reviewTitle,
        String reviewText,
        String reviewStatus,
        Long reporterUserId,
        String reporterFullName,
        String reporterEmail,
        String reportReason,
        String details,
        ReviewReportStatus status,
        String decisionNotes,
        Long resolvedByAdminId,
        String resolvedByAdminName,
        LocalDateTime resolvedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ReviewReportDto fromEntity(ReviewReport report) {
        if (report == null) return null;

        Review review = report.getReview();
        return new ReviewReportDto(
                report.getId(),
                review != null ? review.getId() : null,
                report.getGarage() != null ? report.getGarage().getId() : null,
                report.getGarage() != null ? report.getGarage().getName() : "Workshop",
                report.getGarage() != null ? report.getGarage().getCity() : null,
                (review != null && review.getUser() != null) ? review.getUser().getId() : null,
                (review != null && review.getUser() != null) ? review.getUser().getFullName() : "Anonymous",
                (review != null && review.getUser() != null) ? review.getUser().getEmail() : null,
                review != null ? review.getOverallRating() : null,
                review != null ? review.getReviewTitle() : null,
                review != null ? review.getReviewText() : null,
                review != null ? review.getStatus().name() : null,
                report.getReporter() != null ? report.getReporter().getId() : null,
                report.getReporter() != null ? report.getReporter().getFullName() : "Unknown Reporter",
                report.getReporter() != null ? report.getReporter().getEmail() : null,
                report.getReportReason(),
                report.getDetails(),
                report.getStatus(),
                report.getDecisionNotes(),
                report.getResolvedBy() != null ? report.getResolvedBy().getId() : null,
                report.getResolvedBy() != null ? report.getResolvedBy().getFullName() : null,
                report.getResolvedAt(),
                report.getCreatedAt(),
                report.getUpdatedAt()
        );
    }
}
