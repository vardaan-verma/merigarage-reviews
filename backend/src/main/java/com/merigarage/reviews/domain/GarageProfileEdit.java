package com.merigarage.reviews.domain;

import com.merigarage.reviews.domain.enums.EditStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "garage_profile_edits")
public class GarageProfileEdit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_user_id", nullable = false)
    private User submittedBy;

    @NotBlank
    @Size(max = 150)
    @Column(name = "proposed_name", nullable = false, length = 150)
    private String proposedName;

    @Column(name = "proposed_description", columnDefinition = "TEXT")
    private String proposedDescription;

    @NotBlank
    @Size(max = 255)
    @Column(name = "proposed_address_line1", nullable = false, length = 255)
    private String proposedAddressLine1;

    @Size(max = 255)
    @Column(name = "proposed_address_line2", length = 255)
    private String proposedAddressLine2;

    @NotBlank
    @Size(max = 100)
    @Column(name = "proposed_city", nullable = false, length = 100)
    private String proposedCity;

    @NotBlank
    @Size(max = 100)
    @Column(name = "proposed_state", nullable = false, length = 100)
    private String proposedState;

    @NotBlank
    @Size(max = 20)
    @Column(name = "proposed_postal_code", nullable = false, length = 20)
    private String proposedPostalCode;

    @NotBlank
    @Size(max = 20)
    @Column(name = "proposed_phone_number", nullable = false, length = 20)
    private String proposedPhoneNumber;

    @Size(max = 255)
    @Column(name = "proposed_email", length = 255)
    private String proposedEmail;

    @Size(max = 255)
    @Column(name = "proposed_website_url", length = 255)
    private String proposedWebsiteUrl;

    @Column(name = "proposed_latitude", precision = 10, scale = 7)
    private BigDecimal proposedLatitude;

    @Column(name = "proposed_longitude", precision = 10, scale = 7)
    private BigDecimal proposedLongitude;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private EditStatus status = EditStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_admin_id")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Size(max = 255)
    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public GarageProfileEdit() {
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

    public User getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(User submittedBy) {
        this.submittedBy = submittedBy;
    }

    public String getProposedName() {
        return proposedName;
    }

    public void setProposedName(String proposedName) {
        this.proposedName = proposedName;
    }

    public String getProposedDescription() {
        return proposedDescription;
    }

    public void setProposedDescription(String proposedDescription) {
        this.proposedDescription = proposedDescription;
    }

    public String getProposedAddressLine1() {
        return proposedAddressLine1;
    }

    public void setProposedAddressLine1(String proposedAddressLine1) {
        this.proposedAddressLine1 = proposedAddressLine1;
    }

    public String getProposedAddressLine2() {
        return proposedAddressLine2;
    }

    public void setProposedAddressLine2(String proposedAddressLine2) {
        this.proposedAddressLine2 = proposedAddressLine2;
    }

    public String getProposedCity() {
        return proposedCity;
    }

    public void setProposedCity(String proposedCity) {
        this.proposedCity = proposedCity;
    }

    public String getProposedState() {
        return proposedState;
    }

    public void setProposedState(String proposedState) {
        this.proposedState = proposedState;
    }

    public String getProposedPostalCode() {
        return proposedPostalCode;
    }

    public void setProposedPostalCode(String proposedPostalCode) {
        this.proposedPostalCode = proposedPostalCode;
    }

    public String getProposedPhoneNumber() {
        return proposedPhoneNumber;
    }

    public void setProposedPhoneNumber(String proposedPhoneNumber) {
        this.proposedPhoneNumber = proposedPhoneNumber;
    }

    public String getProposedEmail() {
        return proposedEmail;
    }

    public void setProposedEmail(String proposedEmail) {
        this.proposedEmail = proposedEmail;
    }

    public String getProposedWebsiteUrl() {
        return proposedWebsiteUrl;
    }

    public void setProposedWebsiteUrl(String proposedWebsiteUrl) {
        this.proposedWebsiteUrl = proposedWebsiteUrl;
    }

    public BigDecimal getProposedLatitude() {
        return proposedLatitude;
    }

    public void setProposedLatitude(BigDecimal proposedLatitude) {
        this.proposedLatitude = proposedLatitude;
    }

    public BigDecimal getProposedLongitude() {
        return proposedLongitude;
    }

    public void setProposedLongitude(BigDecimal proposedLongitude) {
        this.proposedLongitude = proposedLongitude;
    }

    public EditStatus getStatus() {
        return status;
    }

    public void setStatus(EditStatus status) {
        this.status = status;
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

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
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
        GarageProfileEdit that = (GarageProfileEdit) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
