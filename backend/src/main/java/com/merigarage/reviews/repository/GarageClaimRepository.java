package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.enums.ClaimStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageClaimRepository extends JpaRepository<GarageClaim, Long> {

    @Override
    @EntityGraph(attributePaths = {"garage", "claimantUser"})
    Optional<GarageClaim> findById(Long id);

    @EntityGraph(attributePaths = {"garage", "claimantUser"})
    List<GarageClaim> findByGarageId(Long garageId);

    @EntityGraph(attributePaths = {"garage", "claimantUser"})
    List<GarageClaim> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    @EntityGraph(attributePaths = {"garage", "claimantUser"})
    List<GarageClaim> findByClaimantUserId(Long claimantUserId);

    @EntityGraph(attributePaths = {"garage", "claimantUser"})
    List<GarageClaim> findByClaimantUserIdOrderByCreatedAtDesc(Long claimantUserId);

    @EntityGraph(attributePaths = {"garage", "claimantUser"})
    Optional<GarageClaim> findByGarageIdAndClaimantUserIdAndClaimStatus(Long garageId, Long claimantUserId, ClaimStatus status);

    @EntityGraph(attributePaths = {"garage", "claimantUser"})
    List<GarageClaim> findByClaimStatus(ClaimStatus status);

    @EntityGraph(attributePaths = {"garage", "claimantUser"})
    List<GarageClaim> findByClaimStatusOrderByCreatedAtDesc(ClaimStatus status);
}
