package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.ReviewReport;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.ReviewReportStatus;
import com.merigarage.reviews.domain.enums.ReviewStatus;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.ReviewReportRepository;
import com.merigarage.reviews.repository.ReviewRepository;
import com.merigarage.reviews.service.dto.CreateReviewReportRequest;
import com.merigarage.reviews.service.dto.ModerateReviewReportRequest;
import com.merigarage.reviews.service.dto.ReviewReportDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional(readOnly = true)
public class ReviewReportService {

    private static final Logger log = LoggerFactory.getLogger(ReviewReportService.class);

    private final ReviewReportRepository reportRepository;
    private final ReviewRepository reviewRepository;
    private final GarageRepository garageRepository;
    private final ReviewService reviewService;
    private final AuditTrailService auditTrailService;

    public ReviewReportService(ReviewReportRepository reportRepository,
                               ReviewRepository reviewRepository,
                               GarageRepository garageRepository,
                               ReviewService reviewService,
                               AuditTrailService auditTrailService) {
        this.reportRepository = reportRepository;
        this.reviewRepository = reviewRepository;
        this.garageRepository = garageRepository;
        this.reviewService = reviewService;
        this.auditTrailService = auditTrailService;
    }

    @Transactional
    public ReviewReportDto createReport(Long garageId, Long reviewId, CreateReviewReportRequest request, User reporterUser) {
        if (reporterUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to report a review.");
        }
        if (request == null || request.reportReason() == null || request.reportReason().isBlank()) {
            throw new ValidationException("Report reason is required.");
        }

        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        if (!review.getGarage().getId().equals(garageId)) {
            throw new ValidationException("Review does not belong to the specified garage.");
        }

        // Prevent duplicate pending reports from the same user for the same review
        if (reportRepository.existsByReviewIdAndReporterIdAndStatus(reviewId, reporterUser.getId(), ReviewReportStatus.PENDING)) {
            throw new DuplicateResourceException("You already have an active pending moderation report for this review.");
        }

        ReviewReport report = new ReviewReport(
                review,
                garage,
                reporterUser,
                request.reportReason().trim(),
                request.details() != null ? request.details().trim() : null
        );

        ReviewReport saved = reportRepository.save(report);

        if (auditTrailService != null) {
            auditTrailService.recordAction(reporterUser, "REVIEW_REPORT_SUBMITTED", "REVIEW_REPORT", saved.getId(),
                    "PENDING", "Report submitted for review #" + reviewId + ": " + request.reportReason(),
                    "{\"reviewId\":" + reviewId + ",\"garageId\":" + garageId + ",\"reason\":\"" + request.reportReason() + "\"}");
        }

        log.info("User {} reported review {} for garage {}. Reason: {}", reporterUser.getId(), reviewId, garageId, request.reportReason());
        return ReviewReportDto.fromEntity(saved);
    }

    public Page<ReviewReportDto> searchReports(ReviewReportStatus status, String search, Pageable pageable) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        return reportRepository.searchReports(status, cleanSearch, pageable)
                .map(ReviewReportDto::fromEntity);
    }

    public ReviewReportDto getReportById(Long reportId) {
        ReviewReport report = reportRepository.findWithDetailsById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Review report not found with id: " + reportId));
        return ReviewReportDto.fromEntity(report);
    }

    @Transactional
    public ReviewReportDto moderateReport(Long reportId, ModerateReviewReportRequest request, User adminUser) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Administrator authorization required for moderation.");
        }
        if (request == null || request.action() == null || request.action().isBlank()) {
            throw new ValidationException("Moderation action is required.");
        }

        ReviewReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Review report not found with id: " + reportId));

        Review review = report.getReview();
        String action = request.action().trim().toUpperCase();
        String notes = (request.decisionNotes() != null && !request.decisionNotes().isBlank())
                ? request.decisionNotes().trim()
                : "Moderated by administrator";

        switch (action) {
            case "DISMISS" -> {
                report.setStatus(ReviewReportStatus.DISMISSED);
                report.setDecisionNotes(notes);
            }
            case "HIDE_REVIEW" -> {
                review.setStatus(ReviewStatus.HIDDEN);
                reviewRepository.save(review);
                report.setStatus(ReviewReportStatus.RESOLVED);
                report.setDecisionNotes(notes + " [Review marked HIDDEN]");
            }
            case "DELETE_REVIEW" -> {
                reviewService.softDeleteReview(review.getId(), notes, adminUser);
                report.setStatus(ReviewReportStatus.RESOLVED);
                report.setDecisionNotes(notes + " [Review SOFT-DELETED]");
            }
            default -> throw new ValidationException("Unsupported moderation action: " + action + ". Allowed: DISMISS, HIDE_REVIEW, DELETE_REVIEW");
        }

        report.setResolvedBy(adminUser);
        report.setResolvedAt(LocalDateTime.now());
        ReviewReport saved = reportRepository.save(report);

        if (auditTrailService != null) {
            auditTrailService.recordAction(adminUser, "REVIEW_REPORT_MODERATED", "REVIEW_REPORT", reportId,
                    saved.getStatus().name(), "Moderation decision: " + action + ". Notes: " + notes,
                    "{\"reportId\":" + reportId + ",\"action\":\"" + action + "\",\"reviewId\":" + review.getId() + ",\"notes\":\"" + notes + "\"}");
        }

        log.info("Admin {} moderated report {}: action={}, review={}", adminUser.getId(), reportId, action, review.getId());
        return ReviewReportDto.fromEntity(saved);
    }
}
