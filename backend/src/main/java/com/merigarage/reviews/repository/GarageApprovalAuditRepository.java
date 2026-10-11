package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GarageApprovalAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageApprovalAuditRepository extends JpaRepository<GarageApprovalAudit, Long> {

    List<GarageApprovalAudit> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    List<GarageApprovalAudit> findByAdminUserIdOrderByCreatedAtDesc(Long adminUserId);
}
