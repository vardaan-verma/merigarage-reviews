package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.domain.enums.ServiceCategory;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.ServiceCatalogueService;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.CreateServiceRequest;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GarageManagementControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private ServiceCatalogueService catalogueService;

    @Autowired
    private GarageRepository garageRepository;

    private String ownerEmail;
    private String otherUserEmail;
    private static final String PASSWORD = "Password123!";

    private User owner;
    private User otherUser;
    private Garage ownerGarage;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        ownerEmail = "owner." + suffix + "@test.com";
        otherUserEmail = "other." + suffix + "@test.com";

        owner = userService.registerUser(new RegisterUserRequest(ownerEmail, PASSWORD, "Garage Owner", "9876543210"));
        otherUser = userService.registerUser(new RegisterUserRequest(otherUserEmail, PASSWORD, "Other User", "9876543211"));

        // Create garage and set owner
        ownerGarage = garageService.createGarage(new CreateGarageRequest(
                "Speedy Works " + suffix, "Great auto shop", "10 Station Rd", null,
                "Bengaluru", "Karnataka", "560001", "9876543210",
                "speedy." + suffix + "@test.com", null, null, null
        ), owner);
        ownerGarage.setOwner(owner);
        garageRepository.save(ownerGarage);
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
    void anonymousRequests_DeniedOnProtectedEndpoints_Returns401() throws Exception {
        mockMvc.perform(post("/api/garages")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/garages/" + ownerGarage.getId() + "/edits")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void csrfProtection_StateChangingRequestWithoutCsrf_Returns403() throws Exception {
        MockHttpSession session = login(ownerEmail);

        // State changing POST without .with(csrf()) must be denied by Spring Security CSRF filter
        mockMvc.perform(post("/api/garages")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "New Garage",
                                    "addressLine1": "123 St",
                                    "city": "Pune",
                                    "state": "MH",
                                    "postalCode": "411001",
                                    "phoneNumber": "9876543210"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void createGarageListing_AuthenticatedUser_Success_Returns201() throws Exception {
        MockHttpSession session = login(otherUserEmail);
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        String jsonBody = """
                {
                    "name": "Fresh Garage %s",
                    "description": "Clean shop",
                    "addressLine1": "77 Ring Rd",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "postalCode": "600001",
                    "phoneNumber": "9998887776",
                    "email": "fresh.%s@example.com"
                }
                """.formatted(suffix, suffix);

        mockMvc.perform(post("/api/garages")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Fresh Garage " + suffix))
                .andExpect(jsonPath("$.city").value("Chennai"));
    }

    @Test
    void ownershipEnforcement_NonOwnerAttemptingEdit_Returns403() throws Exception {
        MockHttpSession otherSession = login(otherUserEmail);

        String editJson = """
                {
                    "proposedName": "Hacked Name",
                    "proposedAddressLine1": "Hacked Address",
                    "proposedCity": "Bengaluru",
                    "proposedState": "Karnataka",
                    "proposedPostalCode": "560001",
                    "proposedPhoneNumber": "9876543210"
                }
                """;

        mockMvc.perform(post("/api/garages/{id}/edits", ownerGarage.getId())
                        .session(otherSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(editJson))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Only the authorized garage owner can perform this operation."));
    }

    @Test
    void submitProfileEdit_Owner_Success_Returns201() throws Exception {
        MockHttpSession ownerSession = login(ownerEmail);

        String editJson = """
                {
                    "proposedName": "Speedy Works Updated",
                    "proposedDescription": "Upgraded equipment",
                    "proposedAddressLine1": "10 Station Rd Suite 2",
                    "proposedCity": "Bengaluru",
                    "proposedState": "Karnataka",
                    "proposedPostalCode": "560001",
                    "proposedPhoneNumber": "9876543210"
                }
                """;

        mockMvc.perform(post("/api/garages/{id}/edits", ownerGarage.getId())
                        .session(ownerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(editJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.proposedName").value("Speedy Works Updated"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void associateAndDisassociateService_Owner_Success() throws Exception {
        MockHttpSession ownerSession = login(ownerEmail);

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        com.merigarage.reviews.domain.Service catService = catalogueService.createService(new CreateServiceRequest(
                "Car Wash " + suffix, ServiceCategory.PERIODIC_MAINTENANCE, "Exterior Foam Wash", (short) 2, true
        ), owner);

        String associateJson = """
                {
                    "serviceId": %d,
                    "startingPrice": 499.00,
                    "isAvailable": true
                }
                """.formatted(catService.getId());

        // Associate
        mockMvc.perform(post("/api/garages/{id}/services", ownerGarage.getId())
                        .session(ownerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(associateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceId").value(catService.getId()))
                .andExpect(jsonPath("$.startingPrice").value(499.00));

        // Disassociate
        mockMvc.perform(delete("/api/garages/{id}/services/{serviceId}", ownerGarage.getId(), catService.getId())
                        .session(ownerSession)
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void uploadPhoto_Owner_Success_AndRejectsInvalidFileType() throws Exception {
        MockHttpSession ownerSession = login(ownerEmail);

        // Valid image
        MockMultipartFile validPhoto = new MockMultipartFile(
                "file", "workshop.jpg", "image/jpeg", "image bytes".getBytes()
        );

        mockMvc.perform(multipart("/api/garages/{id}/photos", ownerGarage.getId())
                        .file(validPhoto)
                        .param("caption", "Our Workshop")
                        .param("isCover", "true")
                        .session(ownerSession)
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.caption").value("Our Workshop"))
                .andExpect(jsonPath("$.isCover").value(true))
                .andExpect(jsonPath("$.storageKey").doesNotExist()); // Storage key must not be exposed

        // Invalid file type (e.g. text/plain or exe)
        MockMultipartFile invalidFile = new MockMultipartFile(
                "file", "script.sh", "application/x-sh", "echo bad".getBytes()
        );

        mockMvc.perform(multipart("/api/garages/{id}/photos", ownerGarage.getId())
                        .file(invalidFile)
                        .session(ownerSession)
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    void uploadDocument_Owner_Success_KeepsDocumentPrivate() throws Exception {
        MockHttpSession ownerSession = login(ownerEmail);

        MockMultipartFile pdfDoc = new MockMultipartFile(
                "file", "gst_certificate.pdf", "application/pdf", "%PDF-1.4 dummy".getBytes()
        );

        mockMvc.perform(multipart("/api/garages/{id}/documents", ownerGarage.getId())
                        .file(pdfDoc)
                        .param("documentType", DocumentType.GST_CERTIFICATE.name())
                        .session(ownerSession)
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.documentType").value("GST_CERTIFICATE"))
                .andExpect(jsonPath("$.verificationStatus").value("PENDING"))
                .andExpect(jsonPath("$.storageKey").doesNotExist()); // Storage key must not be returned
    }

    @Test
    void uploadPhoto_CreatorWithoutOwnerRole_Success_AndNonCreatorRejected() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String creatorEmail = "creator." + suffix + "@test.com";
        User creator = userService.registerUser(new RegisterUserRequest(creatorEmail, PASSWORD, "Garage Creator", "9876543212"));

        // Create garage where owner is null (pending unowned listing)
        Garage pendingGarage = garageService.createGarage(new CreateGarageRequest(
                "Creator Garage " + suffix, "Created by regular user", "12 Main St", null,
                "Jaipur", "Rajasthan", "302001", "9876543212",
                "creator." + suffix + "@test.com", null, null, null
        ), creator);

        assertThat(pendingGarage.getOwner()).isNull();
        assertThat(pendingGarage.getCreatedBy().getId()).isEqualTo(creator.getId());

        MockHttpSession creatorSession = login(creatorEmail);
        MockMultipartFile validPhoto = new MockMultipartFile(
                "file", "creator_shop.jpg", "image/jpeg", "image bytes".getBytes()
        );

        // Creator should be authorized to upload photos during the listing flow
        mockMvc.perform(multipart("/api/garages/{id}/photos", pendingGarage.getId())
                        .file(validPhoto)
                        .param("caption", "Shop Front")
                        .param("isCover", "true")
                        .session(creatorSession)
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.caption").value("Shop Front"))
                .andExpect(jsonPath("$.isCover").value(true));

        // Third-party user who is neither owner nor creator must be rejected with 403 Forbidden
        MockHttpSession otherSession = login(otherUserEmail);
        mockMvc.perform(multipart("/api/garages/{id}/photos", pendingGarage.getId())
                        .file(validPhoto)
                        .session(otherSession)
                        .with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }
}
