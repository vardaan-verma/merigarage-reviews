package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.repository.GarageRepository;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GarageClaimControllerTest {

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
    private GarageRepository garageRepository;

    private String claimantEmail;
    private static final String PASSWORD = "Password123!";
    private User claimant;
    private Garage unownedGarage;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        claimantEmail = "claimant." + suffix + "@test.com";
        claimant = userService.registerUser(new RegisterUserRequest(claimantEmail, PASSWORD, "Claimant User", null));

        // Create an unowned garage listing
        unownedGarage = garageService.createGarage(new CreateGarageRequest(
                "Unclaimed Garage " + suffix, "Great shop", "55 Market Rd", null,
                "Jaipur", "Rajasthan", "302001", "9876543210",
                null, null, null, null
        ), claimant);
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
    void submitClaim_Success_AndCanViewMyClaims() throws Exception {
        MockHttpSession session = login(claimantEmail);

        String claimJson = """
                {
                    "claimMessage": "I am the registered proprietor of this garage."
                }
                """;

        // Submit claim
        mockMvc.perform(post("/api/garages/{id}/claims", unownedGarage.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(claimJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.garageId").value(unownedGarage.getId()))
                .andExpect(jsonPath("$.claimStatus").value("PENDING"))
                .andExpect(jsonPath("$.claimMessage").value("I am the registered proprietor of this garage."));

        // View my claims
        mockMvc.perform(get("/api/claims/my-claims")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].garageId").value(unownedGarage.getId()))
                .andExpect(jsonPath("$[0].claimStatus").value("PENDING"));
    }

    @Test
    void submitClaim_DuplicatePendingClaim_Returns409() throws Exception {
        MockHttpSession session = login(claimantEmail);

        String claimJson = """
                {
                    "claimMessage": "First claim."
                }
                """;

        mockMvc.perform(post("/api/garages/{id}/claims", unownedGarage.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(claimJson))
                .andExpect(status().isCreated());

        // Duplicate claim attempt
        mockMvc.perform(post("/api/garages/{id}/claims", unownedGarage.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(claimJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("You already have a pending claim for this garage."));
    }

    @Test
    void submitClaim_AlreadyOwnedGarage_Returns400() throws Exception {
        MockHttpSession session = login(claimantEmail);

        // Assign owner to garage
        unownedGarage.setOwner(claimant);
        garageRepository.save(unownedGarage);

        String claimJson = """
                {
                    "claimMessage": "Attempting to claim already owned garage."
                }
                """;

        mockMvc.perform(post("/api/garages/{id}/claims", unownedGarage.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(claimJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Garage already has an assigned owner. Cannot submit claim."));
    }
}
