package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.ReviewResponse;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.ReviewRepository;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.CreateReviewRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import com.merigarage.reviews.service.dto.UpdateReviewRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ReviewServiceTest {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private GarageClaimService claimService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private com.merigarage.reviews.repository.GarageRepository garageRepository;

    private User createTestUser(String prefix) {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        return userService.registerUser(new RegisterUserRequest(
                prefix + "." + uid + "@example.com",
                "Password123!",
                prefix + " User",
                "9876543210"
        ));
    }

    private Garage createTestGarage(User creator) {
        return garageService.createGarage(new CreateGarageRequest(
                "Review Test Garage " + UUID.randomUUID().toString().substring(0, 8),
                "Description",
                "Address 1",
                null,
                "Delhi",
                "Delhi",
                "110001",
                "+911122334455",
                null,
                null,
                null,
                null
        ), creator);
    }

    @Test
    void createReview_ValidatesRatingsBetweenOneAndFive() {
        User author = createTestUser("author");
        User creator = createTestUser("creator");
        Garage garage = createTestGarage(creator);

        // Rating = 0 (below min 1)
        CreateReviewRequest reqInvalidLow = new CreateReviewRequest(
                (byte) 0, (byte) 4, (byte) 4, (byte) 4,
                "Great service", "Really good work!"
        );
        assertThatThrownBy(() -> reviewService.createReview(garage.getId(), reqInvalidLow, author))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("must be between 1 and 5");

        // Rating = 6 (above max 5)
        CreateReviewRequest reqInvalidHigh = new CreateReviewRequest(
                (byte) 5, (byte) 6, (byte) 4, (byte) 4,
                "Great service", "Really good work!"
        );
        assertThatThrownBy(() -> reviewService.createReview(garage.getId(), reqInvalidHigh, author))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("must be between 1 and 5");
    }

    @Test
    void createReview_PreventsGarageOwnerFromReviewingTheirOwnGarage() {
        User creator = createTestUser("creator");
        User owner = createTestUser("owner");
        User admin = createTestUser("admin");
        Garage garage = createTestGarage(creator);

        // Assign owner
        garage.setOwner(owner);
        garageRepository.save(garage);

        CreateReviewRequest request = new CreateReviewRequest(
                (byte) 5, (byte) 5, (byte) 5, (byte) 5,
                "Best garage in town", "We do the best repairs"
        );

        assertThatThrownBy(() -> reviewService.createReview(garage.getId(), request, owner))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("not permitted to review their own garage");
    }

    @Test
    void createReview_SupportsMultipleReviewsPerUserPerGarage_WithDistinctIds() {
        User author = createTestUser("author");
        User otherUser = createTestUser("other");
        User creator = createTestUser("creator");
        User admin = createTestUser("admin");
        Garage garage = createTestGarage(creator);

        CreateReviewRequest request1 = new CreateReviewRequest(
                (byte) 4, (byte) 4, (byte) 4, (byte) 4,
                "First visit", "Finished on time for first visit"
        );
        CreateReviewRequest request2 = new CreateReviewRequest(
                (byte) 5, (byte) 5, (byte) 5, (byte) 5,
                "Second visit", "Even better service on second visit"
        );

        // 1. First review by user
        Review review1 = reviewService.createReview(garage.getId(), request1, author);
        assertThat(review1.getId()).isNotNull();

        // 2. Second review by SAME user for SAME garage succeeds with distinct ID
        Review review2 = reviewService.createReview(garage.getId(), request2, author);
        assertThat(review2.getId()).isNotNull();
        assertThat(review2.getId()).isNotEqualTo(review1.getId());

        // 3. User cannot edit another user's review
        UpdateReviewRequest updateRequest = new UpdateReviewRequest(
                (byte) 5, (byte) 5, (byte) 5, (byte) 5,
                "Hacked Title", "Hacked Text"
        );
        assertThatThrownBy(() -> reviewService.updateReview(review1.getId(), updateRequest, otherUser))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Only the original review author can edit this review");

        // 4. Soft-deleted review remains hidden publicly while active review remains visible
        reviewService.softDeleteReview(review1.getId(), "Inappropriate language", admin);
        Review deleted = reviewRepository.findById(review1.getId()).orElseThrow();
        assertThat(deleted.getIsDeleted()).isTrue();

        org.springframework.data.domain.Page<Review> activePage = reviewService.getActiveReviewsForGarage(
                garage.getId(), org.springframework.data.domain.PageRequest.of(0, 10)
        );
        assertThat(activePage.getContent()).extracting(Review::getId)
                .contains(review2.getId())
                .doesNotContain(review1.getId());
    }

    @Test
    void updateReview_PreservesOriginalCreatedAtTimestamp() {
        User author = createTestUser("author");
        User creator = createTestUser("creator");
        Garage garage = createTestGarage(creator);

        Review review = reviewService.createReview(garage.getId(), new CreateReviewRequest(
                (byte) 3, (byte) 3, (byte) 3, (byte) 3,
                "Average", "Fair job"
        ), author);

        LocalDateTime originalCreatedAt = review.getCreatedAt();

        UpdateReviewRequest updateRequest = new UpdateReviewRequest(
                (byte) 5, (byte) 5, (byte) 5, (byte) 5,
                "Updated: Excellent", "They fixed everything!"
        );

        Review updated = reviewService.updateReview(review.getId(), updateRequest, author);

        assertThat(updated.getRatingServiceQuality()).isEqualTo((byte) 5);
        assertThat(updated.getReviewTitle()).isEqualTo("Updated: Excellent");
        assertThat(updated.getCreatedAt()).isEqualTo(originalCreatedAt);
    }

    @Test
    void respondToReview_OnlyOwnerMayRespond_AndAtMostOneResponsePerReview() {
        User creator = createTestUser("creator");
        User owner = createTestUser("owner");
        User otherUser = createTestUser("other");
        User admin = createTestUser("admin");
        User reviewer = createTestUser("reviewer");

        Garage garage = createTestGarage(creator);
        garage.setOwner(owner);
        garageRepository.save(garage);

        Review review = reviewService.createReview(garage.getId(), new CreateReviewRequest(
                (byte) 4, (byte) 4, (byte) 4, (byte) 4,
                "Nice work", "Satisfied"
        ), reviewer);

        // Non-owner cannot respond
        assertThatThrownBy(() -> reviewService.respondToReview(review.getId(), "Thank you", otherUser))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Only the authorized current garage owner may respond");

        // Verified owner responds successfully
        ReviewResponse response = reviewService.respondToReview(review.getId(), "Thank you for trusting us!", owner);
        assertThat(response.getId()).isNotNull();
        assertThat(response.getResponseText()).isEqualTo("Thank you for trusting us!");

        // Owner attempts a second response -> rejected
        assertThatThrownBy(() -> reviewService.respondToReview(review.getId(), "Second reply", owner))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("A response has already been submitted for this review");
    }

    @Test
    void softDeleteReview_RequiresReason_AndRetainsRecord() {
        User creator = createTestUser("creator");
        User reviewer = createTestUser("reviewer");
        User admin = createTestUser("admin");
        Garage garage = createTestGarage(creator);

        Review review = reviewService.createReview(garage.getId(), new CreateReviewRequest(
                (byte) 1, (byte) 1, (byte) 1, (byte) 1,
                "Bad", "Bad experience"
        ), reviewer);

        // Soft deletion without reason must fail
        assertThatThrownBy(() -> reviewService.softDeleteReview(review.getId(), "   ", admin))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("deletion reason is required");

        // Soft deletion with reason succeeds and retains record
        Review softDeleted = reviewService.softDeleteReview(review.getId(), "Violates terms of service", admin);

        assertThat(softDeleted.getIsDeleted()).isTrue();
        assertThat(softDeleted.getDeletionReason()).isEqualTo("Violates terms of service");
        assertThat(softDeleted.getDeletedBy().getId()).isEqualTo(admin.getId());
        assertThat(softDeleted.getDeletedAt()).isNotNull();

        // Record still exists in repository
        Review persisted = reviewRepository.findById(review.getId()).orElseThrow();
        assertThat(persisted).isNotNull();
        assertThat(persisted.getIsDeleted()).isTrue();
    }
}
