package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageApprovalAudit;
import com.merigarage.reviews.domain.GarageProfileEdit;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AuditActionType;
import com.merigarage.reviews.domain.enums.EditStatus;
import com.merigarage.reviews.repository.GarageApprovalAuditRepository;
import com.merigarage.reviews.repository.GarageProfileEditRepository;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.ProfileEditRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GarageProfileEditServiceTest {

    @Autowired
    private GarageProfileEditService editService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private UserService userService;

    @Autowired
    private GarageProfileEditRepository editRepository;

    @Autowired
    private GarageApprovalAuditRepository auditRepository;

    private User createTestUser(String prefix) {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        return userService.registerUser(new RegisterUserRequest(
                prefix + "." + uid + "@example.com",
                "Password123!",
                prefix + " User",
                "9876543210"
        ));
    }

    @Test
    void submitProfileEdit_ReplacesExistingPendingProposalAndCancelsOld() {
        User creator = createTestUser("creator");
        User admin = createTestUser("admin");

        Garage garage = garageService.createGarage(new CreateGarageRequest(
                "Original Garage " + UUID.randomUUID().toString().substring(0, 8),
                "Old Description",
                "100 Street",
                null,
                "Pune",
                "Maharashtra",
                "411001",
                "+919999999999",
                null,
                null,
                null,
                null
        ), creator);
        garageService.approveGarage(garage.getId(), admin, "Initial approve");

        ProfileEditRequest edit1 = new ProfileEditRequest(
                "Proposed Name 1",
                "Proposed Description 1",
                "101 Street",
                null,
                "Pune",
                "Maharashtra",
                "411001",
                "+919999999999",
                null,
                null,
                null,
                null
        );

        GarageProfileEdit proposal1 = editService.submitProfileEdit(garage.getId(), edit1, creator);
        assertThat(proposal1.getStatus()).isEqualTo(EditStatus.PENDING);

        // Submitting second proposal must supersede and CANCEL proposal1
        ProfileEditRequest edit2 = new ProfileEditRequest(
                "Proposed Name 2",
                "Proposed Description 2",
                "102 Street",
                null,
                "Pune",
                "Maharashtra",
                "411001",
                "+919999999999",
                null,
                null,
                null,
                null
        );

        GarageProfileEdit proposal2 = editService.submitProfileEdit(garage.getId(), edit2, creator);
        assertThat(proposal2.getStatus()).isEqualTo(EditStatus.PENDING);

        // Reload proposal1
        GarageProfileEdit reloadedProposal1 = editRepository.findById(proposal1.getId()).orElseThrow();
        assertThat(reloadedProposal1.getStatus()).isEqualTo(EditStatus.CANCELLED);

        // Ensure only one pending proposal remains
        List<GarageProfileEdit> edits = editRepository.findByGarageId(garage.getId());
        long pendingCount = edits.stream().filter(e -> e.getStatus() == EditStatus.PENDING).count();
        assertThat(pendingCount).isEqualTo(1);
    }

    @Test
    void approveProfileEdit_AtomicallyUpdatesLiveGarage_AndRecordsAudit() {
        User creator = createTestUser("creator");
        User admin = createTestUser("admin");

        Garage garage = garageService.createGarage(new CreateGarageRequest(
                "Pre Edit Garage " + UUID.randomUUID().toString().substring(0, 8),
                "Initial Desc",
                "Old Address",
                null,
                "Bengaluru",
                "Karnataka",
                "560001",
                "+918888888888",
                null,
                null,
                null,
                null
        ), creator);
        garage = garageService.approveGarage(garage.getId(), admin, "Initial approve");

        ProfileEditRequest editReq = new ProfileEditRequest(
                "New Garage Brand",
                "Updated Brand Description",
                "New Address 456",
                "Building 2",
                "Bengaluru",
                "Karnataka",
                "560002",
                "+918888888889",
                "contact@newbrand.com",
                "https://newbrand.com",
                null,
                null
        );

        GarageProfileEdit proposal = editService.submitProfileEdit(garage.getId(), editReq, creator);

        // Before approval, live garage retains old data
        Garage liveBefore = garageService.getGarageById(garage.getId());
        assertThat(liveBefore.getName()).startsWith("Pre Edit Garage");

        // Admin approves edit
        GarageProfileEdit approvedProposal = editService.approveProfileEdit(proposal.getId(), admin, "Approved branding update");

        assertThat(approvedProposal.getStatus()).isEqualTo(EditStatus.APPROVED);
        assertThat(approvedProposal.getReviewedBy().getId()).isEqualTo(admin.getId());

        // Live garage is atomically updated
        Garage liveAfter = garageService.getGarageById(garage.getId());
        assertThat(liveAfter.getName()).isEqualTo("New Garage Brand");
        assertThat(liveAfter.getDescription()).isEqualTo("Updated Brand Description");
        assertThat(liveAfter.getAddressLine1()).isEqualTo("New Address 456");
        assertThat(liveAfter.getPostalCode()).isEqualTo("560002");

        // Audit entry recorded
        List<GarageApprovalAudit> audits = auditRepository.findByGarageIdOrderByCreatedAtDesc(garage.getId());
        assertThat(audits).isNotEmpty();
        GarageApprovalAudit audit = audits.get(0);
        assertThat(audit.getActionType()).isEqualTo(AuditActionType.PROFILE_EDIT_APPROVED);
        assertThat(audit.getReferenceEdit().getId()).isEqualTo(approvedProposal.getId());
    }
}
