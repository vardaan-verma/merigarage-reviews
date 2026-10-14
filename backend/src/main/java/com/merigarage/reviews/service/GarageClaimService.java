package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.ClaimStatus;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageClaimRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class GarageClaimService {

    private final GarageClaimRepository claimRepository;
    private final GarageRepository garageRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    public GarageClaimService(GarageClaimRepository claimRepository,
                              GarageRepository garageRepository,
                              RoleRepository roleRepository,
                              UserRoleRepository userRoleRepository) {
        this.claimRepository = claimRepository;
        this.garageRepository = garageRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    public GarageClaim submitClaim(Long garageId, String claimMessage, User claimantUser) {
        if (claimantUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to submit a garage claim.");
        }
        if (claimMessage == null || claimMessage.isBlank()) {
            throw new ValidationException("Claim message is required.");
        }

        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        // Prevent claiming a garage that already has an owner
        if (garage.getOwner() != null) {
            throw new InvalidOperationException("Garage already has an assigned owner. Cannot submit claim.");
        }

        // Prevent duplicate simultaneous pending claims by the same user for the same garage
        claimRepository.findByGarageIdAndClaimantUserIdAndClaimStatus(garageId, claimantUser.getId(), ClaimStatus.PENDING)
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("You already have a pending claim for this garage.");
                });

        GarageClaim claim = new GarageClaim();
        claim.setGarage(garage);
        claim.setClaimantUser(claimantUser);
        claim.setClaimMessage(claimMessage.trim());
        claim.setClaimStatus(ClaimStatus.PENDING);

        return claimRepository.save(claim);
    }

    @Transactional
    public GarageClaim approveClaim(Long claimId, User adminUser, String decisionNotes) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        GarageClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage claim not found with id: " + claimId));

        if (claim.getClaimStatus() != ClaimStatus.PENDING) {
            throw new InvalidOperationException("Claim is not in PENDING status. Current status: " + claim.getClaimStatus());
        }

        Garage garage = claim.getGarage();
        if (garage.getOwner() != null) {
            throw new InvalidOperationException("Garage already has an assigned owner.");
        }

        User claimant = claim.getClaimantUser();

        // 1. Assign owner to garage
        garage.setOwner(claimant);
        garageRepository.save(garage);

        // 2. Approve claim
        claim.setClaimStatus(ClaimStatus.APPROVED);
        claim.setReviewedBy(adminUser);
        claim.setReviewedAt(LocalDateTime.now());
        claim.setDecisionNotes(decisionNotes);
        GarageClaim savedClaim = claimRepository.save(claim);

        // 3. Grant ROLE_GARAGE_OWNER to the claimant user atomically
        Role garageOwnerRole = roleRepository.findByName(RoleName.ROLE_GARAGE_OWNER)
                .orElseThrow(() -> new ResourceNotFoundException("Role ROLE_GARAGE_OWNER not found in database."));

        if (!userRoleRepository.existsByUserIdAndRoleId(claimant.getId(), garageOwnerRole.getId())) {
            UserRole userRole = new UserRole(claimant, garageOwnerRole);
            userRoleRepository.save(userRole);
        }

        return savedClaim;
    }

    @Transactional
    public GarageClaim rejectClaim(Long claimId, User adminUser, String decisionNotes) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        GarageClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage claim not found with id: " + claimId));

        if (claim.getClaimStatus() != ClaimStatus.PENDING) {
            throw new InvalidOperationException("Claim is not in PENDING status. Current status: " + claim.getClaimStatus());
        }

        claim.setClaimStatus(ClaimStatus.REJECTED);
        claim.setReviewedBy(adminUser);
        claim.setReviewedAt(LocalDateTime.now());
        claim.setDecisionNotes(decisionNotes);

        return claimRepository.save(claim);
    }

    public List<GarageClaim> getClaimsForGarage(Long garageId) {
        return claimRepository.findByGarageIdOrderByCreatedAtDesc(garageId);
    }

    public List<GarageClaim> getClaimsByUser(Long userId) {
        return claimRepository.findByClaimantUserIdOrderByCreatedAtDesc(userId);
    }

    public List<GarageClaim> getPendingClaimsForAdmin() {
        return claimRepository.findByClaimStatusOrderByCreatedAtDesc(ClaimStatus.PENDING);
    }
}
