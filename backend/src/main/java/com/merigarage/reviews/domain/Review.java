package com.merigarage.reviews.domain;

import com.merigarage.reviews.domain.enums.ReviewStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull
    @Min(1)
    @Max(5)
    @Column(name = "rating_service_quality", nullable = false)
    private Byte ratingServiceQuality;

    @NotNull
    @Min(1)
    @Max(5)
    @Column(name = "rating_pricing", nullable = false)
    private Byte ratingPricing;

    @NotNull
    @Min(1)
    @Max(5)
    @Column(name = "rating_timeline", nullable = false)
    private Byte ratingTimeline;

    @NotNull
    @Min(1)
    @Max(5)
    @Column(name = "rating_communication", nullable = false)
    private Byte ratingCommunication;

    /**
     * Stored generated column in MySQL:
     * ROUND((rating_service_quality + rating_pricing + rating_timeline + rating_communication) / 4.0, 2)
     * Must be read-only in Hibernate (insertable = false, updatable = false).
     */
    @Column(name = "overall_rating", precision = 3, scale = 2, insertable = false, updatable = false)
    private BigDecimal overallRating;

    @Size(max = 150)
    @Column(name = "review_title", length = 150)
    private String reviewTitle;

    @NotBlank
    @Column(name = "review_text", nullable = false, columnDefinition = "TEXT")
    private String reviewText;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ReviewStatus status = ReviewStatus.PUBLISHED;

    @NotNull
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by_admin_id")
    private User deletedBy;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Size(max = 255)
    @Column(name = "deletion_reason", length = 255)
    private String deletionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Review() {
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Garage getGarage() {
        return garage;
    }

    public void setGarage(Garage garage) {
        this.garage = garage;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Byte getRatingServiceQuality() {
        return ratingServiceQuality;
    }

    public void setRatingServiceQuality(Byte ratingServiceQuality) {
        this.ratingServiceQuality = ratingServiceQuality;
    }

    public Byte getRatingPricing() {
        return ratingPricing;
    }

    public void setRatingPricing(Byte ratingPricing) {
        this.ratingPricing = ratingPricing;
    }

    public Byte getRatingTimeline() {
        return ratingTimeline;
    }

    public void setRatingTimeline(Byte ratingTimeline) {
        this.ratingTimeline = ratingTimeline;
    }

    public Byte getRatingCommunication() {
        return ratingCommunication;
    }

    public void setRatingCommunication(Byte ratingCommunication) {
        this.ratingCommunication = ratingCommunication;
    }

    public BigDecimal getOverallRating() {
        return overallRating;
    }

    public String getReviewTitle() {
        return reviewTitle;
    }

    public void setReviewTitle(String reviewTitle) {
        this.reviewTitle = reviewTitle;
    }

    public String getReviewText() {
        return reviewText;
    }

    public void setReviewText(String reviewText) {
        this.reviewText = reviewText;
    }

    public ReviewStatus getStatus() {
        return status;
    }

    public void setStatus(ReviewStatus status) {
        this.status = status;
    }

    public Boolean getIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(Boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public User getDeletedBy() {
        return deletedBy;
    }

    public void setDeletedBy(User deletedBy) {
        this.deletedBy = deletedBy;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public String getDeletionReason() {
        return deletionReason;
    }

    public void setDeletionReason(String deletionReason) {
        this.deletionReason = deletionReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Review review = (Review) o;
        return id != null && Objects.equals(id, review.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
