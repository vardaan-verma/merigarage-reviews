package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.ClaimStatus;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.domain.enums.DocumentVerificationStatus;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.repository.GarageDocumentRepository;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
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

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private GarageDocumentRepository documentRepository;

    private User createTestUser(String prefix, RoleName role) {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        User user = userService.registerUser(new RegisterUserRequest(
                prefix + "." + uid + "@example.com",
                "Password123!",
                prefix + " User",
                "9876543210"
        ));
        if (role == RoleName.ROLE_ADMIN) {
            Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElseThrow();
            userRoleRepository.save(new UserRole(user, adminRole));
        }
        return user;
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

    private MockMultipartFile createSamplePdf(String name) {
        return new MockMultipartFile(
                "documents",
                name,
                "application/pdf",
                "Sample PDF content for proof of ownership".getBytes()
        );
    }

    @Test
    void submitClaim_PreventsDuplicatePendingClaimsBySameUser() {
        User creator = createTestUser("creator", RoleName.ROLE_USER);
        User claimant = createTestUser("claimant", RoleName.ROLE_USER);
        Garage garage = createTestGarage(creator);

        GarageClaim firstClaim = claimService.submitClaim(garage.getId(), "I am the real owner", claimant);
        assertThat(firstClaim.getClaimStatus()).isEqualTo(ClaimStatus.PENDING);

        // Attempting second claim while first is still pending must throw DuplicateResourceException
        assertThatThrownBy(() -> claimService.submitClaim(garage.getId(), "Duplicate attempt", claimant))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already have a pending claim");
    }

    @Test
    void approveClaim_FailsWhenNoDocumentsAttached() {
        User creator = createTestUser("creator", RoleName.ROLE_USER);
        User claimant = createTestUser("claimant", RoleName.ROLE_USER);
        User admin = createTestUser("admin", RoleName.ROLE_ADMIN);
        Garage garage = createTestGarage(creator);

        GarageClaim claim = claimService.submitClaim(garage.getId(), "Claim with no documents", claimant);

        assertThatThrownBy(() -> claimService.approveClaim(claim.getId(), admin, "Approving without docs"))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("At least one verified proof of ownership document is required");
    }

    @Test
    void approveClaim_FailsWhenDocumentsAreNotVerified() {
        User creator = createTestUser("creator", RoleName.ROLE_USER);
        User claimant = createTestUser("claimant", RoleName.ROLE_USER);
        User admin = createTestUser("admin", RoleName.ROLE_ADMIN);
        Garage garage = createTestGarage(creator);

        MockMultipartFile file = createSamplePdf("shop-license.pdf");
        GarageClaim claim = claimService.submitClaimWithDocuments(
                garage.getId(),
                "Claim with document",
                "Proprietor",
                "9876543210",
                "claimant@test.com",
                "REG-999",
                List.of(file),
                List.of(DocumentType.OWNERSHIP_PROOF),
                claimant
        );

        // Document is PENDING verification
        assertThatThrownBy(() -> claimService.approveClaim(claim.getId(), admin, "Premature approval"))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("All attached verification documents must be reviewed and marked VERIFIED first");
    }

    @Test
    void approveClaim_SucceedsWhenDocumentsVerified_AssignsOwner_AndGrantsRole() {
        User creator = createTestUser("creator", RoleName.ROLE_USER);
        User claimant = createTestUser("claimant", RoleName.ROLE_USER);
        User admin = createTestUser("admin", RoleName.ROLE_ADMIN);
        Garage garage = createTestGarage(creator);

        MockMultipartFile file = createSamplePdf("ownership-deed.pdf");
        GarageClaim claim = claimService.submitClaimWithDocuments(
                garage.getId(),
                "Verified ownership submission",
                "Managing Director",
                "9876543210",
                "claimant@test.com",
                "DL-TRADE-001",
                List.of(file),
                List.of(DocumentType.OWNERSHIP_PROOF),
                claimant
        );

        List<GarageDocument> docs = documentRepository.findByClaimId(claim.getId());
        assertThat(docs).hasSize(1);
        GarageDocument doc = docs.get(0);

        // Admin marks document VERIFIED
        claimService.reviewClaimDocument(claim.getId(), doc.getId(), DocumentVerificationStatus.VERIFIED, null, admin);

        // Verify claimant does not have ROLE_GARAGE_OWNER yet
        List<UserRole> rolesBefore = userRoleRepository.findByUserId(claimant.getId());
        assertThat(rolesBefore).noneMatch(ur -> ur.getRole().getName() == RoleName.ROLE_GARAGE_OWNER);

        // Admin approves claim atomically
        GarageClaim approvedClaim = claimService.approveClaim(claim.getId(), admin, "All trade documents verified");
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
    void approveClaim_AtomicallySupersedesCompetingClaimsForSameGarage() {
        User creator = createTestUser("creator", RoleName.ROLE_USER);
        User claimant1 = createTestUser("claimant1", RoleName.ROLE_USER);
        User claimant2 = createTestUser("claimant2", RoleName.ROLE_USER);
        User admin = createTestUser("admin", RoleName.ROLE_ADMIN);
        Garage garage = createTestGarage(creator);

        // Claimant 1 submits with verified document
        MockMultipartFile file1 = createSamplePdf("c1-proof.pdf");
        GarageClaim claim1 = claimService.submitClaimWithDocuments(
                garage.getId(), "Claimant 1", "Owner One", null, null, null,
                List.of(file1), List.of(DocumentType.OWNERSHIP_PROOF), claimant1
        );
        GarageDocument doc1 = documentRepository.findByClaimId(claim1.getId()).get(0);
        claimService.reviewClaimDocument(claim1.getId(), doc1.getId(), DocumentVerificationStatus.VERIFIED, null, admin);

        // Claimant 2 submits competing claim
        MockMultipartFile file2 = createSamplePdf("c2-proof.pdf");
        GarageClaim claim2 = claimService.submitClaimWithDocuments(
                garage.getId(), "Claimant 2 competing", "Owner Two", null, null, null,
                List.of(file2), List.of(DocumentType.OWNERSHIP_PROOF), claimant2
        );

        // Admin approves Claimant 1
        claimService.approveClaim(claim1.getId(), admin, "Verified legitimate proprietor");

        // Claimant 2's competing claim must now be REJECTED automatically with superseded note
        GarageClaim reloadedClaim2 = claimService.getClaimById(claim2.getId());
        assertThat(reloadedClaim2.getClaimStatus()).isEqualTo(ClaimStatus.REJECTED);
        assertThat(reloadedClaim2.getDecisionNotes()).contains("Superseded");
    }

    @Test
    void submitClaim_ThrowsWhenGarageAlreadyHasOwner() {
        User creator = createTestUser("creator", RoleName.ROLE_USER);
        User claimant1 = createTestUser("claimant1", RoleName.ROLE_USER);
        User claimant2 = createTestUser("claimant2", RoleName.ROLE_USER);
        User admin = createTestUser("admin", RoleName.ROLE_ADMIN);
        Garage garage = createTestGarage(creator);

        // First user claims with verified doc
        MockMultipartFile file = createSamplePdf("doc.pdf");
        GarageClaim claim1 = claimService.submitClaimWithDocuments(
                garage.getId(), "First owner", "Owner 1", null, null, null,
                List.of(file), List.of(DocumentType.OWNERSHIP_PROOF), claimant1
        );
        GarageDocument doc = documentRepository.findByClaimId(claim1.getId()).get(0);
        claimService.reviewClaimDocument(claim1.getId(), doc.getId(), DocumentVerificationStatus.VERIFIED, null, admin);
        claimService.approveClaim(claim1.getId(), admin, "Approved");

        // Second user tries to claim already owned garage
        assertThatThrownBy(() -> claimService.submitClaim(garage.getId(), "Second claim attempt", claimant2))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("already has an assigned owner");
    }

    @Test
    void loadClaimDocumentResource_RestrictsAccessToUnauthorizedUsers() {
        User creator = createTestUser("creator", RoleName.ROLE_USER);
        User claimant = createTestUser("claimant", RoleName.ROLE_USER);
        User bystander = createTestUser("bystander", RoleName.ROLE_USER);
        User admin = createTestUser("admin", RoleName.ROLE_ADMIN);
        Garage garage = createTestGarage(creator);

        MockMultipartFile file = createSamplePdf("private-license.pdf");
        GarageClaim claim = claimService.submitClaimWithDocuments(
                garage.getId(), "Private proof", "Claimant", null, null, null,
                List.of(file), List.of(DocumentType.TRADE_LICENSE), claimant
        );
        GarageDocument doc = documentRepository.findByClaimId(claim.getId()).get(0);

        // Claimant can access their own document
        assertThat(claimService.loadClaimDocumentResource(claim.getId(), doc.getId(), claimant)).isNotNull();

        // Admin can access document
        assertThat(claimService.loadClaimDocumentResource(claim.getId(), doc.getId(), admin)).isNotNull();

        // Unrelated bystander receives ForbiddenOperationException
        assertThatThrownBy(() -> claimService.loadClaimDocumentResource(claim.getId(), doc.getId(), bystander))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("not authorized to view");
    }
}
