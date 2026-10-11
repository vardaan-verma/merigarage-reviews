package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.ClaimStatus;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.repository.UserRoleRepository;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GarageClaimServiceTest {

    @Autowired
    private GarageClaimService claimService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRoleRepository userRoleRepository;

    private User createTestUser(String prefix) {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        return userService.registerUser(new RegisterUserRequest(
                prefix + "." + uid + "@example.com",
                "Password123!",
                prefix + " User",
                "9876543210"
        ));
    }

    private Garage createTestGarage(User creator) {
        return garageService.createGarage(new CreateGarageRequest(
                "Claimable Garage " + UUID.randomUUID().toString().substring(0, 8),
                "Description",
                "Address 1",
                null,
                "Delhi",
                "Delhi",
                "110001",
                "+911122334455",
                null,
                null,
                null,
                null
        ), creator);
    }

    @Test
    void submitClaim_PreventsDuplicatePendingClaimsBySameUser() {
        User creator = createTestUser("creator");
        User claimant = createTestUser("claimant");
        Garage garage = createTestGarage(creator);

        GarageClaim firstClaim = claimService.submitClaim(garage.getId(), "I am the real owner", claimant);
        assertThat(firstClaim.getClaimStatus()).isEqualTo(ClaimStatus.PENDING);

        // Attempting second claim while first is still pending must throw DuplicateResourceException
        assertThatThrownBy(() -> claimService.submitClaim(garage.getId(), "Duplicate attempt", claimant))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already have a pending claim");
    }

    @Test
    void approveClaim_AssignsOwner_ApprovesClaim_AndGrantsGarageOwnerRole() {
        User creator = createTestUser("creator");
        User claimant = createTestUser("claimant");
        User admin = createTestUser("admin");
        Garage garage = createTestGarage(creator);

        GarageClaim claim = claimService.submitClaim(garage.getId(), "Providing tax documents", claimant);

        // Verify claimant does not have ROLE_GARAGE_OWNER yet
        List<UserRole> rolesBefore = userRoleRepository.findByUserId(claimant.getId());
        assertThat(rolesBefore).noneMatch(ur -> ur.getRole().getName() == RoleName.ROLE_GARAGE_OWNER);

        // Admin approves claim
        GarageClaim approvedClaim = claimService.approveClaim(claim.getId(), admin, "Verified documents");

        assertThat(approvedClaim.getClaimStatus()).isEqualTo(ClaimStatus.APPROVED);

        // Garage now has owner assigned
        Garage reloadedGarage = garageService.getGarageById(garage.getId());
        assertThat(reloadedGarage.getOwner()).isNotNull();
        assertThat(reloadedGarage.getOwner().getId()).isEqualTo(claimant.getId());

        // Claimant now has ROLE_GARAGE_OWNER granted
        List<UserRole> rolesAfter = userRoleRepository.findByUserId(claimant.getId());
        assertThat(rolesAfter).anyMatch(ur -> ur.getRole().getName() == RoleName.ROLE_GARAGE_OWNER);
    }

    @Test
    void submitClaim_ThrowsWhenGarageAlreadyHasOwner() {
        User creator = createTestUser("creator");
        User claimant1 = createTestUser("claimant1");
        User claimant2 = createTestUser("claimant2");
        User admin = createTestUser("admin");
        Garage garage = createTestGarage(creator);

        // First user claims and gets approved
        GarageClaim claim1 = claimService.submitClaim(garage.getId(), "First owner", claimant1);
        claimService.approveClaim(claim1.getId(), admin, "Approved");

        // Second user tries to claim already owned garage
        assertThatThrownBy(() -> claimService.submitClaim(garage.getId(), "Second claim attempt", claimant2))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("already has an assigned owner");
    }
}
