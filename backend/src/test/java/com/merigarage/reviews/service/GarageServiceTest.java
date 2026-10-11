package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageApprovalAudit;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AuditActionType;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.repository.GarageApprovalAuditRepository;
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
class GarageServiceTest {

    @Autowired
    private GarageService garageService;

    @Autowired
    private UserService userService;

    @Autowired
    private GarageApprovalAuditRepository auditRepository;

    private User createTestUser() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        return userService.registerUser(new RegisterUserRequest(
                "creator." + uid + "@example.com",
                "Password123!",
                "Garage Creator",
                "9876543210"
        ));
    }

    private User createAdminUser() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        return userService.registerUser(new RegisterUserRequest(
                "admin." + uid + "@example.com",
                "Password123!",
                "Admin User",
                "9876543210"
        ));
    }

    @Test
    void createGarage_StartsInPendingStatus_NotVerified_AndNotPubliclyVisible() {
        User creator = createTestUser();
        String unique = UUID.randomUUID().toString().substring(0, 8);

        CreateGarageRequest request = new CreateGarageRequest(
                "Speedy Auto Repair " + unique,
                "Quality auto servicing",
                "123 Main Street",
                "Suite 4B",
                "Mumbai",
                "Maharashtra",
                "400001",
                "+919876543210",
                "speedy." + unique + "@example.com",
                "https://speedyauto.example.com",
                null,
                null
        );

        Garage created = garageService.createGarage(request, creator);

        assertThat(created.getId()).isNotNull();
        assertThat(created.getCreatedBy().getId()).isEqualTo(creator.getId());
        assertThat(created.getOwner()).isNull();
        assertThat(created.getApprovalStatus()).isEqualTo(GarageApprovalStatus.PENDING);
        assertThat(created.getIsVerified()).isFalse();

        // Not visible via public slug query while PENDING
        assertThatThrownBy(() -> garageService.getPublicGarageBySlug(created.getSlug()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void approveGarage_UpdatesStatusToApproved_AndRecordsAuditTrail() {
        User creator = createTestUser();
        User admin = createAdminUser();

        CreateGarageRequest request = new CreateGarageRequest(
                "Metro Motors " + UUID.randomUUID().toString().substring(0, 8),
                "Trusted repairs",
                "77 Highway Road",
                null,
                "Delhi",
                "Delhi",
                "110001",
                "+911122334455",
                null,
                null,
                null,
                null
        );

        Garage garage = garageService.createGarage(request, creator);
        Garage approved = garageService.approveGarage(garage.getId(), admin, "Verified business license");

        assertThat(approved.getApprovalStatus()).isEqualTo(GarageApprovalStatus.APPROVED);

        // Now accessible publicly
        Garage publicGarage = garageService.getPublicGarageBySlug(approved.getSlug());
        assertThat(publicGarage.getId()).isEqualTo(approved.getId());

        // Check audit record
        List<GarageApprovalAudit> audits = auditRepository.findByGarageIdOrderByCreatedAtDesc(garage.getId());
        assertThat(audits).isNotEmpty();
        GarageApprovalAudit audit = audits.get(0);
        assertThat(audit.getActionType()).isEqualTo(AuditActionType.INITIAL_APPROVAL);
        assertThat(audit.getAdminUser().getId()).isEqualTo(admin.getId());
        assertThat(audit.getPreviousStatus()).isEqualTo(GarageApprovalStatus.PENDING.name());
        assertThat(audit.getNewStatus()).isEqualTo(GarageApprovalStatus.APPROVED.name());
        assertThat(audit.getDecisionNotes()).isEqualTo("Verified business license");
    }
}
