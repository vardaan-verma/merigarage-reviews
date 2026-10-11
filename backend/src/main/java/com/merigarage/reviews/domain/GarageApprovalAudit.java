package com.merigarage.reviews.domain;

import com.merigarage.reviews.domain.enums.AuditActionType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "garage_approval_audit")
public class GarageApprovalAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 50)
    private AuditActionType actionType;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_user_id", nullable = false)
    private User adminUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reference_edit_id")
    private GarageProfileEdit referenceEdit;

    @NotBlank
    @Size(max = 30)
    @Column(name = "previous_status", nullable = false, length = 30)
    private String previousStatus;

    @NotBlank
    @Size(max = 30)
    @Column(name = "new_status", nullable = false, length = 30)
    private String newStatus;

    @NotNull
    @Column(name = "previous_verified", nullable = false)
    private Boolean previousVerified;

    @NotNull
    @Column(name = "new_verified", nullable = false)
    private Boolean newVerified;

    @Column(name = "decision_notes", columnDefinition = "TEXT")
    private String decisionNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public GarageApprovalAudit() {
    }

    public GarageApprovalAudit(Garage garage, AuditActionType actionType, User adminUser,
                               String previousStatus, String newStatus,
                               Boolean previousVerified, Boolean newVerified) {
        this.garage = garage;
        this.actionType = actionType;
        this.adminUser = adminUser;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.previousVerified = previousVerified;
        this.newVerified = newVerified;
    }


    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
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

    public AuditActionType getActionType() {
        return actionType;
    }

    public void setActionType(AuditActionType actionType) {
        this.actionType = actionType;
    }

    public User getAdminUser() {
        return adminUser;
    }

    public void setAdminUser(User adminUser) {
        this.adminUser = adminUser;
    }

    public GarageProfileEdit getReferenceEdit() {
        return referenceEdit;
    }

    public void setReferenceEdit(GarageProfileEdit referenceEdit) {
        this.referenceEdit = referenceEdit;
    }

    public String getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(String previousStatus) {
        this.previousStatus = previousStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }

    public Boolean getPreviousVerified() {
        return previousVerified;
    }

    public void setPreviousVerified(Boolean previousVerified) {
        this.previousVerified = previousVerified;
    }

    public Boolean getNewVerified() {
        return newVerified;
    }

    public void setNewVerified(Boolean newVerified) {
        this.newVerified = newVerified;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GarageApprovalAudit that = (GarageApprovalAudit) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
