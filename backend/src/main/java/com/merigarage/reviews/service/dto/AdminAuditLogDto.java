package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.AdminAuditLog;

import java.time.LocalDateTime;

public record AdminAuditLogDto(
        Long id,
        Long adminUserId,
        String adminUserName,
        String adminUserEmail,
        String actionType,
        String targetType,
        Long targetId,
        String outcome,
        String reason,
        String metadataJson,
        LocalDateTime createdAt
) {
    public static AdminAuditLogDto fromEntity(AdminAuditLog log) {
        return new AdminAuditLogDto(
                log.getId(),
                log.getAdminUser() != null ? log.getAdminUser().getId() : null,
                log.getAdminUser() != null ? log.getAdminUser().getFullName() : null,
                log.getAdminUser() != null ? log.getAdminUser().getEmail() : null,
                log.getActionType(),
                log.getTargetType(),
                log.getTargetId(),
                log.getOutcome(),
                log.getReason(),
                log.getMetadataJson(),
                log.getCreatedAt()
        );
    }
}
