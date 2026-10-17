package com.merigarage.reviews.security;

import com.merigarage.reviews.domain.AdminAuditLog;
import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.*;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.repository.AdminAuditLogRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import com.merigarage.reviews.service.AdminPortalService;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.UserAuthorizationService;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import com.merigarage.reviews.service.dto.UpdateUserStatusRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminSecurityAndAuditTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private UserAuthorizationService authorizationService;

    @Autowired
    private AdminPortalService adminPortalService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    private User adminUser;
    private User targetUser;
    private Garage testGarage;

    @BeforeEach
    void setUp() {
        String uid = UUID.randomUUID().toString().substring(0, 8);

        // Create an admin user with ROLE_ADMIN
        adminUser = userService.registerUser(new RegisterUserRequest(
                "audit.admin." + uid + "@example.com",
                "Password123!",
                "Audit Admin",
                null
        ));
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElseThrow();
        // Manually link admin role directly for test setup
        userRoleRepository.save(new UserRole(adminUser, adminRole));

        // Create a regular target user
        targetUser = userService.registerUser(new RegisterUserRequest(
                "target." + uid + "@example.com",
                "Password123!",
                "Target User",
                null
        ));

        // Create a garage for approval testing
        testGarage = new Garage();
        testGarage.setName("Audit Test Garage " + uid);
        testGarage.setSlug("audit-test-garage-" + uid);
        testGarage.setAddressLine1("123 Industrial Area");
        testGarage.setCity("Gurugram");
        testGarage.setState("Haryana");
        testGarage.setPostalCode("122001");
        testGarage.setPhoneNumber("9876543210");
        testGarage.setApprovalStatus(GarageApprovalStatus.PENDING);
        testGarage.setIsVerified(false);
        testGarage.setCreatedBy(targetUser);
        testGarage = garageRepository.save(testGarage);
    }

    @Test
    void userStatusChange_GeneratesAuditLog() {
        long initialLogCount = auditLogRepository.count();

        adminPortalService.updateUserStatus(
                targetUser.getId(),
                new UpdateUserStatusRequest(UserStatus.SUSPENDED, "Suspicious activity detected"),
                adminUser
        );

        User updatedUser = userRepository.findById(targetUser.getId()).orElseThrow();
        assertThat(updatedUser.getStatus()).isEqualTo(UserStatus.SUSPENDED);

        List<AdminAuditLog> logs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("USER", targetUser.getId());
        assertThat(logs).isNotEmpty();

        AdminAuditLog log = logs.get(0);
        assertThat(log.getActionType()).isEqualTo("USER_STATUS_CHANGE");
        assertThat(log.getAdminUser().getId()).isEqualTo(adminUser.getId());
        assertThat(log.getOutcome()).isEqualTo("SUCCESS");
        assertThat(log.getReason()).contains("Suspicious activity detected");
        assertThat(log.getMetadataJson()).contains("SUSPENDED");
        assertThat(auditLogRepository.count()).isGreaterThan(initialLogCount);
    }

    @Test
    void roleGrantAndRevoke_GeneratesAuditLogs() {
        authorizationService.grantRole(targetUser.getId(), RoleName.ROLE_GARAGE_OWNER, adminUser);

        List<AdminAuditLog> grantLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("USER", targetUser.getId());
        assertThat(grantLogs).isNotEmpty();
        AdminAuditLog grantLog = grantLogs.get(0);
        assertThat(grantLog.getActionType()).isEqualTo("USER_ROLE_ASSIGNMENT");
        assertThat(grantLog.getOutcome()).isEqualTo("GRANTED");
        assertThat(grantLog.getReason()).contains("ROLE_GARAGE_OWNER");

        authorizationService.revokeRole(targetUser.getId(), RoleName.ROLE_GARAGE_OWNER, adminUser);

        List<AdminAuditLog> revokeLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("USER", targetUser.getId());
        AdminAuditLog revokeLog = revokeLogs.get(0);
        assertThat(revokeLog.getActionType()).isEqualTo("USER_ROLE_REVOCATION");
        assertThat(revokeLog.getOutcome()).isEqualTo("REVOKED");
    }

    @Test
    void permissionGrantAndRevoke_GeneratesAuditLogs() {
        authorizationService.grantAdminPermission(targetUser.getId(), AdminPermissionCode.DATA_EXPORT, adminUser);

        List<AdminAuditLog> grantLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("USER", targetUser.getId());
        assertThat(grantLogs).isNotEmpty();
        AdminAuditLog grantLog = grantLogs.get(0);
        assertThat(grantLog.getActionType()).isEqualTo("USER_PERMISSION_GRANT");
        assertThat(grantLog.getOutcome()).isEqualTo("GRANTED");
        assertThat(grantLog.getReason()).contains("DATA_EXPORT");

        authorizationService.revokeAdminPermission(targetUser.getId(), AdminPermissionCode.DATA_EXPORT, adminUser);

        List<AdminAuditLog> revokeLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("USER", targetUser.getId());
        AdminAuditLog revokeLog = revokeLogs.get(0);
        assertThat(revokeLog.getActionType()).isEqualTo("USER_PERMISSION_REVOKE");
        assertThat(revokeLog.getOutcome()).isEqualTo("REVOKED");
    }

    @Test
    void garageApprovalAndSuspension_GeneratesAuditLogs() {
        garageService.approveGarage(testGarage.getId(), adminUser, "Listing verified and legitimate");

        Garage approvedGarage = garageRepository.findById(testGarage.getId()).orElseThrow();
        assertThat(approvedGarage.getApprovalStatus()).isEqualTo(GarageApprovalStatus.APPROVED);

        List<AdminAuditLog> approveLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("GARAGE", testGarage.getId());
        assertThat(approveLogs).isNotEmpty();
        AdminAuditLog approveLog = approveLogs.get(0);
        assertThat(approveLog.getActionType()).isEqualTo("GARAGE_APPROVAL");
        assertThat(approveLog.getOutcome()).isEqualTo("APPROVED");
        assertThat(approveLog.getReason()).contains("Listing verified and legitimate");

        garageService.suspendGarage(testGarage.getId(), adminUser, "Policy breach");

        List<AdminAuditLog> suspendLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("GARAGE", testGarage.getId());
        AdminAuditLog suspendLog = suspendLogs.get(0);
        assertThat(suspendLog.getActionType()).isEqualTo("GARAGE_SUSPENSION");
        assertThat(suspendLog.getOutcome()).isEqualTo("SUSPENDED");
        assertThat(suspendLog.getReason()).contains("Policy breach");
    }

    @Test
    void garageVerifiedStatusToggle_GeneratesAuditLogs() {
        garageService.setVerifiedStatus(testGarage.getId(), true, adminUser, "Physical inspection verified");

        List<AdminAuditLog> verifiedLogs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("GARAGE", testGarage.getId());
        assertThat(verifiedLogs).isNotEmpty();
        AdminAuditLog log = verifiedLogs.get(0);
        assertThat(log.getActionType()).isEqualTo("GARAGE_VERIFIED_STATUS_GRANTED");
        assertThat(log.getOutcome()).isEqualTo("VERIFIED");
    }

    @Test
    void dataExport_GeneratesAuditLog() {
        adminPortalService.exportCsv("users", adminUser);

        List<AdminAuditLog> exportLogs = auditLogRepository.findAll().stream()
                .filter(l -> "DATA_EXPORT".equals(l.getActionType()))
                .toList();

        assertThat(exportLogs).isNotEmpty();
        AdminAuditLog exportLog = exportLogs.get(exportLogs.size() - 1);
        assertThat(exportLog.getTargetType()).isEqualTo("EXPORT_USERS");
        assertThat(exportLog.getAdminUser().getId()).isEqualTo(adminUser.getId());
        assertThat(exportLog.getOutcome()).isEqualTo("SUCCESS");
        assertThat(exportLog.getMetadataJson()).contains("users");
    }

    @Test
    void adminSelfStatusChange_Prevented() {
        assertThatThrownBy(() -> adminPortalService.updateUserStatus(
                adminUser.getId(),
                new UpdateUserStatusRequest(UserStatus.SUSPENDED, "Self-suspension"),
                adminUser
        ))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Administrators cannot change their own account status");
    }
}
