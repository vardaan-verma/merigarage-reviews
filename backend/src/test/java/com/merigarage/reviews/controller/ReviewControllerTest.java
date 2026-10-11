package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.ReviewService;
import com.merigarage.reviews.service.UserAuthorizationService;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.CreateReviewRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
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
class ReviewControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private UserAuthorizationService authorizationService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private com.merigarage.reviews.repository.RoleRepository roleRepository;

    @Autowired
    private com.merigarage.reviews.repository.UserRoleRepository userRoleRepository;

    @Autowired
    private com.merigarage.reviews.repository.AdminPermissionRepository permissionRepository;

    @Autowired
    private com.merigarage.reviews.repository.UserAdminPermissionRepository userPermissionRepository;

    @Autowired
    private GarageRepository garageRepository;

    private User authorUser;
    private User ownerUser;
    private User otherUser;
    private User moderationAdmin;
    private User plainAdmin;
    private Garage approvedGarage;

    private static final String PASSWORD = "Password123!";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);

        authorUser = userService.registerUser(new RegisterUserRequest("author." + suffix + "@test.com", PASSWORD, "Review Author", null));
        ownerUser = userService.registerUser(new RegisterUserRequest("owner." + suffix + "@test.com", PASSWORD, "Garage Owner", null));
        otherUser = userService.registerUser(new RegisterUserRequest("other." + suffix + "@test.com", PASSWORD, "Other User", null));

        plainAdmin = userService.registerUser(new RegisterUserRequest("plain." + suffix + "@test.com", PASSWORD, "Plain Admin", null));
        com.merigarage.reviews.domain.Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElseThrow();
        userRoleRepository.save(new com.merigarage.reviews.domain.UserRole(plainAdmin, adminRole));

        moderationAdmin = userService.registerUser(new RegisterUserRequest("mod." + suffix + "@test.com", PASSWORD, "Moderator Admin", null));
        userRoleRepository.save(new com.merigarage.reviews.domain.UserRole(moderationAdmin, adminRole));
        com.merigarage.reviews.domain.AdminPermission modPerm = permissionRepository.findByCode(AdminPermissionCode.CONTENT_MODERATION).orElseThrow();
        userPermissionRepository.save(new com.merigarage.reviews.domain.UserAdminPermission(moderationAdmin, modPerm, plainAdmin));

        // Create approved garage with owner
        approvedGarage = garageService.createGarage(new CreateGarageRequest(
                "Reviewable Garage " + suffix, "Quality repair", "10 North Rd", null,
                "Delhi", "Delhi", "110001", "9876543210", null, null, null, null
        ), ownerUser);
        approvedGarage.setOwner(ownerUser);
        garageRepository.save(approvedGarage);
        garageService.approveGarage(approvedGarage.getId(), plainAdmin, "Approved");
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
    void createReview_Success_AndAllowsMultipleReviewsPerUser() throws Exception {
        MockHttpSession authorSession = login(authorUser.getEmail());

        String reviewJson1 = """
                {
                    "ratingServiceQuality": 5,
                    "ratingPricing": 4,
                    "ratingTimeline": 5,
                    "ratingCommunication": 4,
                    "reviewTitle": "Excellent first service",
                    "reviewText": "They repaired my suspension quickly and at a fair price."
                }
                """;

        String reviewJson2 = """
                {
                    "ratingServiceQuality": 4,
                    "ratingPricing": 5,
                    "ratingTimeline": 4,
                    "ratingCommunication": 5,
                    "reviewTitle": "Great second visit for oil change",
                    "reviewText": "Routine maintenance done swiftly and affordably on second visit."
                }
                """;

        // 1. Create first review
        MvcResult res1 = mockMvc.perform(post("/api/garages/{garageId}/reviews", approvedGarage.getId())
                        .session(authorSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.authorFullName").value("Review Author"))
                .andExpect(jsonPath("$.overallRating").value(4.5))
                .andExpect(jsonPath("$.reviewTitle").value("Excellent first service"))
                .andReturn();

        // 2. Second review by same author succeeds with different ID
        MvcResult res2 = mockMvc.perform(post("/api/garages/{garageId}/reviews", approvedGarage.getId())
                        .session(authorSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.authorFullName").value("Review Author"))
                .andExpect(jsonPath("$.overallRating").value(4.5))
                .andExpect(jsonPath("$.reviewTitle").value("Great second visit for oil change"))
                .andReturn();

        Number id1 = com.jayway.jsonpath.JsonPath.read(res1.getResponse().getContentAsString(), "$.id");
        Number id2 = com.jayway.jsonpath.JsonPath.read(res2.getResponse().getContentAsString(), "$.id");
        assertThat(id1.longValue()).isNotEqualTo(id2.longValue());

        // 3. Public GET reviews endpoint returns both published reviews with 4 category ratings & author details
        mockMvc.perform(get("/api/garages/{garageId}/reviews", approvedGarage.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].authorFullName").value("Review Author"))
                .andExpect(jsonPath("$.content[0].ratingServiceQuality").isNumber())
                .andExpect(jsonPath("$.content[0].ratingPricing").isNumber())
                .andExpect(jsonPath("$.content[0].ratingTimeline").isNumber())
                .andExpect(jsonPath("$.content[0].ratingCommunication").isNumber())
                .andExpect(jsonPath("$.content[0].overallRating").isNumber());
    }

    @Test
    void createReview_ValidationFailure_Returns400() throws Exception {
        MockHttpSession authorSession = login(authorUser.getEmail());

        // Invalid rating (value 6 is > 5)
        String invalidJson = """
                {
                    "ratingServiceQuality": 6,
                    "ratingPricing": 4,
                    "ratingTimeline": 5,
                    "ratingCommunication": 4,
                    "reviewTitle": "Too high",
                    "reviewText": "Valid text"
                }
                """;

        mockMvc.perform(post("/api/garages/{garageId}/reviews", approvedGarage.getId())
                        .session(authorSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    void updateReview_OnlyAuthorPermitted() throws Exception {
        Review review = reviewService.createReview(approvedGarage.getId(), new CreateReviewRequest(
                (byte) 4, (byte) 4, (byte) 4, (byte) 4, "Initial Title", "Initial review body"
        ), authorUser);

        MockHttpSession authorSession = login(authorUser.getEmail());
        MockHttpSession otherSession = login(otherUser.getEmail());

        String updateJson = """
                {
                    "ratingServiceQuality": 5,
                    "ratingPricing": 5,
                    "ratingTimeline": 5,
                    "ratingCommunication": 5,
                    "reviewTitle": "Updated Title",
                    "reviewText": "Updated review body text"
                }
                """;

        // Other user denied -> 403 Forbidden
        mockMvc.perform(put("/api/reviews/{id}", review.getId())
                        .session(otherSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only the original review author can edit this review."));

        // Author update -> 200 OK
        mockMvc.perform(put("/api/reviews/{id}", review.getId())
                        .session(authorSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewTitle").value("Updated Title"))
                .andExpect(jsonPath("$.overallRating").value(5.0));
    }

    @Test
    void ownerResponse_OnlyCurrentGarageOwnerPermitted() throws Exception {
        Review review = reviewService.createReview(approvedGarage.getId(), new CreateReviewRequest(
                (byte) 5, (byte) 5, (byte) 5, (byte) 5, "Great", "Really good"
        ), authorUser);

        MockHttpSession ownerSession = login(ownerUser.getEmail());
        MockHttpSession otherSession = login(otherUser.getEmail());

        String responseJson = """
                {
                    "responseText": "Thank you for trusting our garage!"
                }
                """;

        // Non-owner response attempt -> 403 Forbidden
        mockMvc.perform(post("/api/reviews/{id}/response", review.getId())
                        .session(otherSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(responseJson))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only the authorized current garage owner may respond to a review."));

        // Legitimate owner response -> 201 Created
        mockMvc.perform(post("/api/reviews/{id}/response", review.getId())
                        .session(ownerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(responseJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.responseText").value("Thank you for trusting our garage!"));
    }

    @Test
    void softDeleteReview_RequiresContentModerationPermissionAndMandatoryReason() throws Exception {
        Review review = reviewService.createReview(approvedGarage.getId(), new CreateReviewRequest(
                (byte) 1, (byte) 1, (byte) 1, (byte) 1, "Bad", "Abusive language here"
        ), authorUser);

        MockHttpSession plainAdminSession = login(plainAdmin.getEmail());
        MockHttpSession modAdminSession = login(moderationAdmin.getEmail());

        // 1. Plain admin lacks CONTENT_MODERATION -> 403 Forbidden
        mockMvc.perform(delete("/api/admin/reviews/{id}", review.getId())
                        .session(plainAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"deletionReason": "Violates community guidelines"}
                                """))
                .andExpect(status().isForbidden());

        // 2. Missing deletion reason -> 400 Bad Request
        mockMvc.perform(delete("/api/admin/reviews/{id}", review.getId())
                        .session(modAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"deletionReason": ""}
                                """))
                .andExpect(status().isBadRequest());

        // 3. Authorized moderator with valid reason -> 204 No Content
        mockMvc.perform(delete("/api/admin/reviews/{id}", review.getId())
                        .session(modAdminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"deletionReason": "Violates hate speech and profanity guidelines."}
                                """))
                .andExpect(status().isNoContent());

        // Verify deleted review is no longer in public review listing
        mockMvc.perform(get("/api/garages/{garageId}/reviews", approvedGarage.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == " + review.getId() + ")]").doesNotExist());
    }

    @Test
    void unapprovedGarage_ReviewsNotPubliclyAccessible() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Garage pendingGarage = garageService.createGarage(new CreateGarageRequest(
                "Pending Garage " + suffix, "Desc", "Addr", null,
                "Delhi", "Delhi", "110001", "9876543210", null, null, null, null
        ), authorUser);

        mockMvc.perform(get("/api/garages/{garageId}/reviews", pendingGarage.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Reviews for unapproved garages are not publicly accessible."));
    }
}
