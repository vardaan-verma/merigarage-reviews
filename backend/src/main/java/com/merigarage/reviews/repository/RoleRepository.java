package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Byte> {

    Optional<Role> findByName(RoleName name);

    boolean existsByName(RoleName name);
}
