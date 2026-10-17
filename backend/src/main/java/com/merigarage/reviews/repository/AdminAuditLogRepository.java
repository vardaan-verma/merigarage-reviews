package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    List<AdminAuditLog> findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc(String targetType, Long targetId);

    @Query("""
        SELECT a FROM AdminAuditLog a
        WHERE (:actionType IS NULL OR a.actionType = :actionType)
          AND (:targetType IS NULL OR a.targetType = :targetType)
          AND (:adminUserId IS NULL OR a.adminUser.id = :adminUserId)
          AND (:fromDate IS NULL OR a.createdAt >= :fromDate)
          AND (:toDate IS NULL OR a.createdAt <= :toDate)
        ORDER BY a.createdAt DESC, a.id DESC
    """)
    Page<AdminAuditLog> searchLogs(
            @Param("actionType") String actionType,
            @Param("targetType") String targetType,
            @Param("adminUserId") Long adminUserId,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );
}
