package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.enums.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageClaimRepository extends JpaRepository<GarageClaim, Long> {

    List<GarageClaim> findByGarageId(Long garageId);

    List<GarageClaim> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    List<GarageClaim> findByClaimantUserId(Long claimantUserId);

    Optional<GarageClaim> findByGarageIdAndClaimantUserIdAndClaimStatus(Long garageId, Long claimantUserId, ClaimStatus status);

    List<GarageClaim> findByClaimStatus(ClaimStatus status);
}
