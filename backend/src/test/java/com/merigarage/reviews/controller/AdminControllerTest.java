package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.GarageProfileEdit;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.domain.enums.DocumentVerificationStatus;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.service.*;
import com.merigarage.reviews.service.dto.*;
import com.merigarage.reviews.service.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private com.merigarage.reviews.repository.RoleRepository roleRepository;

    @Autowired
    private com.merigarage.reviews.repository.UserRoleRepository userRoleRepository;

    @Autowired
    private com.merigarage.reviews.repository.AdminPermissionRepository permissionRepository;

    @Autowired
    private com.merigarage.reviews.repository.UserAdminPermissionRepository userPermissionRepository;

    @Autowired
    private GarageService garageService;

    @Autowired
    private GarageProfileEditService profileEditService;

    @Autowired
    private GarageClaimService claimService;

    @Autowired
    private GarageMediaService mediaService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private com.merigarage.reviews.repository.GarageDocumentRepository documentRepository;

    private User plainAdmin;
    private User garageApprovalAdmin;
    private User claimAdmin;
    private User verificationAdmin;
    private User creatorUser;

    private static final String PASSWORD = "Password123!";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        com.merigarage.reviews.domain.Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElseThrow();

        // Plain admin: has ROLE_ADMIN but NO granular permissions
        plainAdmin = userService.registerUser(new RegisterUserRequest("plain.admin." + suffix + "@test.com", PASSWORD, "Plain Admin", null));
        userRoleRepository.save(new com.merigarage.reviews.domain.UserRole(plainAdmin, adminRole));

        // Garage approval admin: has ROLE_ADMIN + GARAGE_APPROVAL
        garageApprovalAdmin = userService.registerUser(new RegisterUserRequest("garage.admin." + suffix + "@test.com", PASSWORD, "Garage Admin", null));
        userRoleRepository.save(new com.merigarage.reviews.domain.UserRole(garageApprovalAdmin, adminRole));
        com.merigarage.reviews.domain.AdminPermission gaPerm = permissionRepository.findByCode(AdminPermissionCode.GARAGE_APPROVAL).orElseThrow();
        userPermissionRepository.save(new com.merigarage.reviews.domain.UserAdminPermission(garageApprovalAdmin, gaPerm, plainAdmin));

        // Claim admin: has ROLE_ADMIN + CLAIM_MANAGEMENT
        claimAdmin = userService.registerUser(new RegisterUserRequest("claim.admin." + suffix + "@test.com", PASSWORD, "Claim Admin", null));
        userRoleRepository.save(new com.merigarage.reviews.domain.UserRole(claimAdmin, adminRole));
        com.merigarage.reviews.domain.AdminPermission cmPerm = permissionRepository.findByCode(AdminPermissionCode.CLAIM_MANAGEMENT).orElseThrow();
        userPermissionRepository.save(new com.merigarage.reviews.domain.UserAdminPermission(claimAdmin, cmPerm, plainAdmin));

        // Verification admin: has ROLE_ADMIN + VERIFICATION_REVIEW
        verificationAdmin = userService.registerUser(new RegisterUserRequest("verif.admin." + suffix + "@test.com", PASSWORD, "Verif Admin", null));
        userRoleRepository.save(new com.merigarage.reviews.domain.UserRole(verificationAdmin, adminRole));
        com.merigarage.reviews.domain.AdminPermission vrPerm = permissionRepository.findByCode(AdminPermissionCode.VERIFICATION_REVIEW).orElseThrow();
        userPermissionRepository.save(new com.merigarage.reviews.domain.UserAdminPermission(verificationAdmin, vrPerm, plainAdmin));

        creatorUser = userService.registerUser(new RegisterUserRequest("creator." + suffix + "@test.com", PASSWORD, "Creator User", null));
    }

    private MockHttpSession login(String email) throws Exception {
        String loginJson = """
                {"email": "%s", "password": "%s"}
                """.formatted(email, PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();

        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void garageApproval_RequiresGranularPermission_PlainAdminDenied() throws Exception {
        Garage garage = garageService.createGarage(new CreateGarageRequest(
                "Pending " + UUID.randomUUID().toString().substring(0, 6), "Desc", "Addr", null,
                "City", "State", "123456", "9876543210", null, null, null, null
        ), creatorUser);

        MockHttpSession plainAdminSession = login(plainAdmin.getEmail());

        // Plain admin has ROLE_ADMIN but lacks GARAGE_APPROVAL -> Must return 403 Forbidden
        mockMvc.perform(post("/api/admin/garages/{id}/approve", garage.getId())
                        .session(plainAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"notes": "Approved by plain admin"}
                                """))
                .andExpect(status().isForbidden());

        // Authorized admin with GARAGE_APPROVAL -> 200 OK
        MockHttpSession garageAdminSession = login(garageApprovalAdmin.getEmail());
        mockMvc.perform(post("/api/admin/garages/{id}/approve", garage.getId())
                        .session(garageAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"notes": "Legitimate approval"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(garage.getId()));

        assertThat(garageService.getGarageById(garage.getId()).getApprovalStatus()).isEqualTo(GarageApprovalStatus.APPROVED);
    }

    @Test
    void profileEditApproval_RequiresGarageApprovalPermission() throws Exception {
        Garage garage = garageService.createGarage(new CreateGarageRequest(
                "Edit Test Garage " + UUID.randomUUID().toString().substring(0, 6), "Desc", "Addr", null,
                "City", "State", "123456", "9876543210", null, null, null, null
        ), creatorUser);
        garageService.approveGarage(garage.getId(), garageApprovalAdmin, "Pre-approved");

        GarageProfileEdit proposal = profileEditService.submitProfileEdit(garage.getId(), new ProfileEditRequest(
                "Updated Name", "Updated Desc", "New Addr", null, "City", "State", "123456", "9876543210",
                null, null, null, null
        ), creatorUser);

        MockHttpSession plainAdminSession = login(plainAdmin.getEmail());
        MockHttpSession garageAdminSession = login(garageApprovalAdmin.getEmail());

        // Plain admin denied
        mockMvc.perform(post("/api/admin/garages/edits/{id}/approve", proposal.getId())
                        .session(plainAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        // Authorized admin approved
        mockMvc.perform(post("/api/admin/garages/edits/{id}/approve", proposal.getId())
                        .session(garageAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"notes": "Profile edit verified"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void claimManagement_RequiresClaimManagementPermission() throws Exception {
        Garage garage = garageService.createGarage(new CreateGarageRequest(
                "Claimable " + UUID.randomUUID().toString().substring(0, 6), "Desc", "Addr", null,
                "City", "State", "123456", "9876543210", null, null, null, null
        ), creatorUser);

        MockMultipartFile sampleDoc = new MockMultipartFile(
                "files", "trade_license.pdf", "application/pdf", "%PDF-1.4 test".getBytes()
        );
        GarageClaim claim = claimService.submitClaimWithDocuments(
                garage.getId(), "Proprietor proof", null, null, null, "REG123",
                List.of(sampleDoc), List.of(DocumentType.OWNERSHIP_PROOF), creatorUser
        );
        GarageDocument doc = documentRepository.findByClaimId(claim.getId()).get(0);
        claimService.reviewClaimDocument(claim.getId(), doc.getId(), DocumentVerificationStatus.VERIFIED, "Doc verified", claimAdmin);

        MockHttpSession plainAdminSession = login(plainAdmin.getEmail());
        MockHttpSession claimAdminSession = login(claimAdmin.getEmail());

        // Plain admin denied
        mockMvc.perform(post("/api/admin/claims/{id}/approve", claim.getId())
                        .session(plainAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"decisionNotes": "Approved"}
                                """))
                .andExpect(status().isForbidden());

        // Claim admin approved
        mockMvc.perform(post("/api/admin/claims/{id}/approve", claim.getId())
                        .session(claimAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"decisionNotes": "Claim verified with trade license"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimStatus").value("APPROVED"));

        // Verify garage owner is now assigned
        Garage updatedGarage = garageService.getGarageById(garage.getId());
        assertThat(updatedGarage.getOwner()).isNotNull();
        assertThat(updatedGarage.getOwner().getId()).isEqualTo(creatorUser.getId());
    }

    @Test
    void verificationReview_RequiresVerificationReviewPermission_AndSecureDocumentDownload() throws Exception {
        Garage garage = garageService.createGarage(new CreateGarageRequest(
                "Verif Garage " + UUID.randomUUID().toString().substring(0, 6), "Desc", "Addr", null,
                "City", "State", "123456", "9876543210", null, null, null, null
        ), creatorUser);

        MockMultipartFile sampleDoc = new MockMultipartFile(
                "file", "tax_id.pdf", "application/pdf", "%PDF-1.4 test".getBytes()
        );
        String storageKey = fileStorageService.storeDocument(sampleDoc, garage.getId());
        GarageDocument doc = mediaService.uploadDocument(garage.getId(), new DocumentUploadRequest(
                DocumentType.GST_CERTIFICATE, storageKey, "tax_id.pdf", "application/pdf", (long) sampleDoc.getSize()
        ), creatorUser);

        MockHttpSession plainAdminSession = login(plainAdmin.getEmail());
        MockHttpSession verifAdminSession = login(verificationAdmin.getEmail());

        // Plain admin denied access to review
        mockMvc.perform(post("/api/admin/documents/{id}/review", doc.getId())
                        .session(plainAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "VERIFIED"}
                                """))
                .andExpect(status().isForbidden());

        // Plain admin denied document download
        mockMvc.perform(get("/api/admin/documents/{id}/download", doc.getId())
                        .session(plainAdminSession))
                .andExpect(status().isForbidden());

        // Authorized verification admin downloads file securely
        mockMvc.perform(get("/api/admin/documents/{id}/download", doc.getId())
                        .session(verifAdminSession))
                .andExpect(status().isOk())
                .andExpect(content().string("%PDF-1.4 test")); // Binary stream content

        // Authorized verification admin reviews document
        mockMvc.perform(post("/api/admin/documents/{id}/review", doc.getId())
                        .session(verifAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "VERIFIED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"));
    }
}
