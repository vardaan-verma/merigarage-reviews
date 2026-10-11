package com.merigarage.reviews.domain;

import com.merigarage.reviews.domain.enums.ClaimStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "garage_claims")
public class GarageClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claimant_user_id", nullable = false)
    private User claimantUser;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "claim_status", nullable = false, length = 30)
    private ClaimStatus claimStatus = ClaimStatus.PENDING;

    @NotBlank
    @Column(name = "claim_message", nullable = false, columnDefinition = "TEXT")
    private String claimMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_admin_id")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "decision_notes", columnDefinition = "TEXT")
    private String decisionNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public GarageClaim() {
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

    public User getClaimantUser() {
        return claimantUser;
    }

    public void setClaimantUser(User claimantUser) {
        this.claimantUser = claimantUser;
    }

    public ClaimStatus getClaimStatus() {
        return claimStatus;
    }

    public void setClaimStatus(ClaimStatus claimStatus) {
        this.claimStatus = claimStatus;
    }

    public String getClaimMessage() {
        return claimMessage;
    }

    public void setClaimMessage(String claimMessage) {
        this.claimMessage = claimMessage;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getDecisionNotes() {
        return decisionNotes;
    }

    public void setDecisionNotes(String decisionNotes) {
        this.decisionNotes = decisionNotes;
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
        GarageClaim that = (GarageClaim) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
