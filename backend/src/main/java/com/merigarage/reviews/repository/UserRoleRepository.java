package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.id.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    List<UserRole> findByUserId(Long userId);

    @Query("SELECT ur.role.name FROM UserRole ur WHERE ur.user.id = :userId")
    Set<RoleName> findRoleNamesByUserId(@Param("userId") Long userId);

    List<UserRole> findByUserIdIn(java.util.Collection<Long> userIds);

    List<UserRole> findByRoleId(Byte roleId);

    long countByRoleId(Byte roleId);

    boolean existsByUserIdAndRoleId(Long userId, Byte roleId);
}
