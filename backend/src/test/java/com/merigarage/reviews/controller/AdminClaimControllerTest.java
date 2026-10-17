package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserAdminPermission;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.ClaimStatus;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.domain.enums.DocumentVerificationStatus;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.repository.AdminPermissionRepository;
import com.merigarage.reviews.repository.GarageDocumentRepository;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserAdminPermissionRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import com.merigarage.reviews.service.GarageClaimService;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminClaimControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private GarageClaimService claimService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private AdminPermissionRepository adminPermissionRepository;

    @Autowired
    private UserAdminPermissionRepository userAdminPermissionRepository;

    @Autowired
    private GarageDocumentRepository documentRepository;

    private static final String PASSWORD = "Password123!";
    private User adminUser;
    private String adminEmail;
    private User regularUser;
    private String regularEmail;
    private Garage testGarage;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Create Admin user with ROLE_ADMIN and CLAIM_MANAGEMENT permission
        adminEmail = "claim.admin." + suffix + "@test.com";
        adminUser = userService.registerUser(new RegisterUserRequest(adminEmail, PASSWORD, "Claim Administrator", null));
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElseThrow();
        userRoleRepository.save(new UserRole(adminUser, adminRole));

        var perm = adminPermissionRepository.findByCode(AdminPermissionCode.CLAIM_MANAGEMENT).orElseThrow();
        userAdminPermissionRepository.save(new UserAdminPermission(adminUser, perm, adminUser));

        // 2. Create Regular customer user
        regularEmail = "customer." + suffix + "@test.com";
        regularUser = userService.registerUser(new RegisterUserRequest(regularEmail, PASSWORD, "Regular Customer", null));

        // 3. Create unowned test garage
        testGarage = garageService.createGarage(new CreateGarageRequest(
                "Workshop " + suffix, "Description", "MG Road", null,
                "Bengaluru", "Karnataka", "560001", "9876543210",
                null, null, null, null
        ), regularUser);
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
    void getPendingClaims_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/claims"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getPendingClaims_RegularUser_Returns403() throws Exception {
        MockHttpSession session = login(regularEmail);
        mockMvc.perform(get("/api/admin/claims").session(session))
                .andExpect(status().isForbidden());
    }

    @Test
    void getPendingClaims_AuthorizedAdmin_ReturnsPendingClaimsWithDocuments() throws Exception {
        MockHttpSession session = login(adminEmail);

        MockMultipartFile file = new MockMultipartFile(
                "documents", "license.pdf", "application/pdf", "Trade license data".getBytes()
        );
        claimService.submitClaimWithDocuments(
                testGarage.getId(), "Proprietor claim", "John Owner", "9876543210",
                regularEmail, "TR-4455", List.of(file), List.of(DocumentType.TRADE_LICENSE), regularUser
        );

        mockMvc.perform(get("/api/admin/claims").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].garageId").value(testGarage.getId()))
                .andExpect(jsonPath("$[0].claimantName").value("John Owner"))
                .andExpect(jsonPath("$[0].documents").isArray())
                .andExpect(jsonPath("$[0].documents[0].documentType").value("TRADE_LICENSE"))
                .andExpect(jsonPath("$[0].documents[0].verificationStatus").value("PENDING"));
    }

    @Test
    void reviewDocument_AndApproveClaim_EndToEndLifecycle() throws Exception {
        MockHttpSession session = login(adminEmail);

        MockMultipartFile file = new MockMultipartFile(
                "documents", "ownership-proof.pdf", "application/pdf", "Proof content".getBytes()
        );
        GarageClaim claim = claimService.submitClaimWithDocuments(
                testGarage.getId(), "Proprietor claim", "John Owner", "9876543210",
                regularEmail, "TR-4455", List.of(file), List.of(DocumentType.OWNERSHIP_PROOF), regularUser
        );
        GarageDocument doc = documentRepository.findByClaimId(claim.getId()).get(0);

        // 1. Attempting approval when document is PENDING must fail (400)
        mockMvc.perform(post("/api/admin/claims/{id}/approve", claim.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisionNotes\": \"Premature approval attempt\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("All attached verification documents must be reviewed and marked VERIFIED first")));

        // 2. Admin reviews and marks document VERIFIED
        String reviewJson = """
                {
                    "status": "VERIFIED"
                }
                """;
        mockMvc.perform(post("/api/admin/claims/{claimId}/documents/{docId}/review", claim.getId(), doc.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"));

        // 3. Admin downloads document securely
        mockMvc.perform(get("/api/admin/claims/{claimId}/documents/{docId}/download", claim.getId(), doc.getId())
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).contains("application/pdf"));

        // 4. Admin approves claim -> Success, owner assigned
        mockMvc.perform(post("/api/admin/claims/{id}/approve", claim.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisionNotes\": \"All legal documents verified successfully\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimStatus").value("APPROVED"));

        // Verify garage owner is updated
        Garage updatedGarage = garageService.getGarageById(testGarage.getId());
        assertThat(updatedGarage.getOwner()).isNotNull();
        assertThat(updatedGarage.getOwner().getId()).isEqualTo(regularUser.getId());
    }

    @Test
    void rejectClaim_WithReason_UpdatesClaimAndDocuments() throws Exception {
        MockHttpSession session = login(adminEmail);

        MockMultipartFile file = new MockMultipartFile(
                "documents", "bad-doc.pdf", "application/pdf", "Bad content".getBytes()
        );
        GarageClaim claim = claimService.submitClaimWithDocuments(
                testGarage.getId(), "Claim to reject", null, null, null, null,
                List.of(file), List.of(DocumentType.OWNERSHIP_PROOF), regularUser
        );

        String rejectJson = """
                {
                    "decisionNotes": "Document appears forged or invalid."
                }
                """;

        mockMvc.perform(post("/api/admin/claims/{id}/reject", claim.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rejectJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimStatus").value("REJECTED"))
                .andExpect(jsonPath("$.decisionNotes").value("Document appears forged or invalid."));

        // Attached documents must also be marked REJECTED
        GarageDocument doc = documentRepository.findByClaimId(claim.getId()).get(0);
        assertThat(doc.getVerificationStatus()).isEqualTo(DocumentVerificationStatus.REJECTED);
        assertThat(doc.getRejectionReason()).isEqualTo("Document appears forged or invalid.");
    }
}
