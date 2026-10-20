package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.ReviewResponse;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.ReviewReportService;
import com.merigarage.reviews.service.ReviewService;
import com.merigarage.reviews.service.dto.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ReviewController {

    private final ReviewService reviewService;
    private final GarageService garageService;
    private final SecurityContextService securityContextService;
    private final ReviewReportService reviewReportService;

    public ReviewController(ReviewService reviewService,
                            GarageService garageService,
                            SecurityContextService securityContextService,
                            ReviewReportService reviewReportService) {
        this.reviewService = reviewService;
        this.garageService = garageService;
        this.securityContextService = securityContextService;
        this.reviewReportService = reviewReportService;
    }

    @GetMapping("/api/garages/{garageId}/reviews")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<PagedResponse<ReviewDto>> getReviewsForGarage(
            @PathVariable Long garageId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        Garage garage = garageService.getGarageById(garageId);
        if (garage.getApprovalStatus() != GarageApprovalStatus.APPROVED) {
            throw new ResourceNotFoundException("Reviews for unapproved garages are not publicly accessible.");
        }

        int validatedPage = Math.max(0, page);
        int validatedSize = Math.min(Math.max(1, size), 50);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String safeSort = "overallrating".equalsIgnoreCase(sortBy) ? "overallRating" : "createdAt";

        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(direction, safeSort).and(Sort.by(Sort.Direction.DESC, "id")));
        Page<Review> reviewPage = reviewService.getActiveReviewsForGarage(garageId, pageable);

        Page<ReviewDto> dtoPage = reviewPage.map(review -> {
            ReviewResponse response = reviewService.getResponseForReview(review.getId()).orElse(null);
            return ReviewDto.fromEntity(review, response);
        });

        return ResponseEntity.ok(PagedResponse.fromPage(dtoPage));
    }

    @GetMapping("/api/reviews/my-reviews")
    public ResponseEntity<List<UserReviewDto>> getMyReviews() {
        User currentUser = securityContextService.getRequiredCurrentUser();
        List<UserReviewDto> reviews = reviewService.getUserReviews(currentUser.getId());
        return ResponseEntity.ok(reviews);
    }

    @PostMapping("/api/garages/{garageId}/reviews")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ReviewDto> createReview(
            @PathVariable Long garageId,
            @Valid @RequestBody CreateReviewRequest request
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        Review created = reviewService.createReview(garageId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ReviewDto.fromEntity(created, null));
    }

    @PutMapping("/api/reviews/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ReviewDto> updateReview(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReviewRequest request
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        Review updated = reviewService.updateReview(id, request, currentUser);
        ReviewResponse response = reviewService.getResponseForReview(updated.getId()).orElse(null);
        return ResponseEntity.ok(ReviewDto.fromEntity(updated, response));
    }

    @PostMapping("/api/reviews/{id}/response")
    public ResponseEntity<ReviewResponseDto> respondToReview(
            @PathVariable Long id,
            @Valid @RequestBody ReviewResponseRequest request
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        ReviewResponse response = reviewService.respondToReview(id, request.responseText(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ReviewResponseDto.fromEntity(response));
    }

    @PostMapping("/api/garages/{garageId}/reviews/{reviewId}/report")
    public ResponseEntity<ReviewReportDto> reportReview(
            @PathVariable Long garageId,
            @PathVariable Long reviewId,
            @Valid @RequestBody CreateReviewReportRequest request
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        ReviewReportDto report = reviewReportService.createReport(garageId, reviewId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    @DeleteMapping("/api/admin/reviews/{id}")
    @PreAuthorize("hasAuthority('CONTENT_MODERATION')")
    public ResponseEntity<Void> softDeleteReview(
            @PathVariable Long id,
            @Valid @RequestBody SoftDeleteReviewRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CONTENT_MODERATION);
        User adminUser = securityContextService.getRequiredCurrentUser();

        reviewService.softDeleteReview(id, request.deletionReason(), adminUser);
        return ResponseEntity.noContent().build();
    }
}
