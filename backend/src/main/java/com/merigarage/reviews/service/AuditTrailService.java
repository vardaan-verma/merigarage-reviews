package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.AdminAuditLog;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.repository.AdminAuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditTrailService {

    private static final Logger log = LoggerFactory.getLogger(AuditTrailService.class);
    private final AdminAuditLogRepository auditLogRepository;

    public AuditTrailService(AdminAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public AdminAuditLog recordAction(
            User adminUser,
            String actionType,
            String targetType,
            Long targetId,
            String outcome,
            String reason,
            String metadataJson
    ) {
        if (adminUser == null) {
            log.warn("Attempted to record audit log without admin user for action: {}", actionType);
            return null;
        }

        AdminAuditLog auditLog = new AdminAuditLog(
                adminUser,
                actionType,
                targetType,
                targetId,
                outcome != null ? outcome : "SUCCESS",
                reason,
                metadataJson
        );

        AdminAuditLog saved = auditLogRepository.save(auditLog);
        log.info("AUDIT: Admin #{} ({}) performed {} on {} #{} with outcome {}. Reason: {}",
                adminUser.getId(), adminUser.getEmail(), actionType, targetType, targetId, outcome, reason);
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<AdminAuditLog> searchLogs(
            String actionType,
            String targetType,
            Long adminUserId,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable
    ) {
        return auditLogRepository.searchLogs(actionType, targetType, adminUserId, fromDate, toDate, pageable);
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLog> getLogsForTarget(String targetType, Long targetId) {
        return auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc(targetType, targetId);
    }
}
