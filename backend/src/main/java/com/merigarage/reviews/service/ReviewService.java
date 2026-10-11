package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.ReviewResponse;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.ReviewStatus;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.ReviewRepository;
import com.merigarage.reviews.repository.ReviewResponseRepository;
import com.merigarage.reviews.service.dto.CreateReviewRequest;
import com.merigarage.reviews.service.dto.UpdateReviewRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewResponseRepository responseRepository;
    private final GarageRepository garageRepository;

    public ReviewService(ReviewRepository reviewRepository,
                         ReviewResponseRepository responseRepository,
                         GarageRepository garageRepository) {
        this.reviewRepository = reviewRepository;
        this.responseRepository = responseRepository;
        this.garageRepository = garageRepository;
    }

    @Transactional
    public Review createReview(Long garageId, CreateReviewRequest request, User authorUser) {
        if (authorUser == null) {
            throw new ForbiddenOperationException("Registered authenticated user is required to write a review.");
        }
        if (request == null) {
            throw new ValidationException("Review request cannot be null.");
        }

        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        // Prevent current garage owner from reviewing their own garage
        if (garage.getOwner() != null && garage.getOwner().getId().equals(authorUser.getId())) {
            throw new ForbiddenOperationException("Garage owner is not permitted to review their own garage.");
        }

        // Enforce one review per user per garage, including reviews that have been soft-deleted
        if (reviewRepository.existsByGarageIdAndUserId(garageId, authorUser.getId())) {
            throw new DuplicateResourceException("You have already reviewed this garage. One review per user per garage is enforced.");
        }

        // Validate ratings 1 to 5
        validateRatings(request.ratingServiceQuality(), request.ratingPricing(), request.ratingTimeline(), request.ratingCommunication());

        if (request.reviewText() == null || request.reviewText().isBlank()) {
            throw new ValidationException("Review text cannot be blank.");
        }

        Review review = new Review();
        review.setGarage(garage);
        review.setUser(authorUser);
        review.setRatingServiceQuality(request.ratingServiceQuality());
        review.setRatingPricing(request.ratingPricing());
        review.setRatingTimeline(request.ratingTimeline());
        review.setRatingCommunication(request.ratingCommunication());
        review.setReviewTitle(request.reviewTitle());
        review.setReviewText(request.reviewText().trim());
        review.setStatus(ReviewStatus.PUBLISHED);
        review.setIsDeleted(false);

        return reviewRepository.save(review);
    }

    @Transactional
    public Review updateReview(Long reviewId, UpdateReviewRequest request, User authorUser) {
        if (authorUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to edit review.");
        }
        if (request == null) {
            throw new ValidationException("Update review request cannot be null.");
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        if (!review.getUser().getId().equals(authorUser.getId())) {
            throw new ForbiddenOperationException("Only the original review author can edit this review.");
        }

        if (Boolean.TRUE.equals(review.getIsDeleted())) {
            throw new InvalidOperationException("Cannot edit a soft-deleted review.");
        }

        validateRatings(request.ratingServiceQuality(), request.ratingPricing(), request.ratingTimeline(), request.ratingCommunication());

        if (request.reviewText() == null || request.reviewText().isBlank()) {
            throw new ValidationException("Review text cannot be blank.");
        }

        review.setRatingServiceQuality(request.ratingServiceQuality());
        review.setRatingPricing(request.ratingPricing());
        review.setRatingTimeline(request.ratingTimeline());
        review.setRatingCommunication(request.ratingCommunication());
        review.setReviewTitle(request.reviewTitle());
        review.setReviewText(request.reviewText().trim());
        // Original createdAt is preserved without modification

        return reviewRepository.save(review);
    }

    @Transactional
    public ReviewResponse respondToReview(Long reviewId, String responseText, User ownerUser) {
        if (ownerUser == null) {
            throw new ForbiddenOperationException("Authenticated garage owner required to respond to review.");
        }
        if (responseText == null || responseText.isBlank()) {
            throw new ValidationException("Response text cannot be blank.");
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        if (Boolean.TRUE.equals(review.getIsDeleted())) {
            throw new InvalidOperationException("Cannot respond to a soft-deleted review.");
        }

        Garage garage = review.getGarage();
        if (garage.getOwner() == null || !garage.getOwner().getId().equals(ownerUser.getId())) {
            throw new ForbiddenOperationException("Only the authorized current garage owner may respond to a review.");
        }

        // At most one response per review
        if (responseRepository.existsByReviewId(reviewId)) {
            throw new DuplicateResourceException("A response has already been submitted for this review. Only one response is permitted.");
        }

        ReviewResponse response = new ReviewResponse(review, ownerUser, responseText.trim());
        return responseRepository.save(response);
    }

    @Transactional
    public Review softDeleteReview(Long reviewId, String deletionReason, User adminUser) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required to delete reviews.");
        }
        if (deletionReason == null || deletionReason.isBlank()) {
            throw new ValidationException("A deletion reason is required to soft-delete a review.");
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        if (Boolean.TRUE.equals(review.getIsDeleted())) {
            throw new InvalidOperationException("Review is already soft-deleted.");
        }

        review.setIsDeleted(true);
        review.setDeletedBy(adminUser);
        review.setDeletionReason(deletionReason.trim());
        review.setDeletedAt(LocalDateTime.now());

        return reviewRepository.save(review);
    }

    public List<Review> getActiveReviewsForGarage(Long garageId) {
        return reviewRepository.findByGarageIdAndIsDeletedFalseOrderByCreatedAtDesc(garageId);
    }

    public org.springframework.data.domain.Page<Review> getActiveReviewsForGarage(Long garageId, org.springframework.data.domain.Pageable pageable) {
        return reviewRepository.findByGarageIdAndStatusAndIsDeletedFalse(garageId, ReviewStatus.PUBLISHED, pageable);
    }

    public java.util.Optional<ReviewResponse> getResponseForReview(Long reviewId) {
        return responseRepository.findByReviewId(reviewId);
    }

    public Review getReviewById(Long reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));
    }

    private void validateRatings(Byte sq, Byte pr, Byte tl, Byte cm) {
        if (sq == null || sq < 1 || sq > 5) {
            throw new ValidationException("Rating for service quality must be between 1 and 5.");
        }
        if (pr == null || pr < 1 || pr > 5) {
            throw new ValidationException("Rating for pricing must be between 1 and 5.");
        }
        if (tl == null || tl < 1 || tl > 5) {
            throw new ValidationException("Rating for timeline must be between 1 and 5.");
        }
        if (cm == null || cm < 1 || cm > 5) {
            throw new ValidationException("Rating for communication must be between 1 and 5.");
        }
    }
}
