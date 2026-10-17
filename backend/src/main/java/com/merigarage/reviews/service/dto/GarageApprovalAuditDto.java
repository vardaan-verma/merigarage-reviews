package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageApprovalAudit;
import com.merigarage.reviews.domain.enums.AuditActionType;

import java.time.LocalDateTime;

public record GarageApprovalAuditDto(
        Long id,
        Long garageId,
        AuditActionType actionType,
        Long adminUserId,
        String adminUserName,
        String previousStatus,
        String newStatus,
        Boolean previousVerified,
        Boolean newVerified,
        String decisionNotes,
        LocalDateTime createdAt
) {
    public static GarageApprovalAuditDto fromEntity(GarageApprovalAudit audit) {
        return new GarageApprovalAuditDto(
                audit.getId(),
                audit.getGarage().getId(),
                audit.getActionType(),
                audit.getAdminUser().getId(),
                audit.getAdminUser().getFullName(),
                audit.getPreviousStatus(),
                audit.getNewStatus(),
                audit.getPreviousVerified(),
                audit.getNewVerified(),
                audit.getDecisionNotes(),
                audit.getCreatedAt()
        );
    }
}
