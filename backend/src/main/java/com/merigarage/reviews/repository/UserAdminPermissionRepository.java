package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.UserAdminPermission;
import com.merigarage.reviews.domain.id.UserAdminPermissionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserAdminPermissionRepository extends JpaRepository<UserAdminPermission, UserAdminPermissionId> {

    List<UserAdminPermission> findByUserId(Long userId);

    boolean existsByUserIdAndPermissionId(Long userId, Byte permissionId);
}
