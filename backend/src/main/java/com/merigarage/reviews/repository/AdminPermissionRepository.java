package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.AdminPermission;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminPermissionRepository extends JpaRepository<AdminPermission, Byte> {

    Optional<AdminPermission> findByCode(AdminPermissionCode code);

    boolean existsByCode(AdminPermissionCode code);
}
