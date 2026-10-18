package com.merigarage.reviews.security;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.repository.GarageQuoteRequestRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.ReviewRepository;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ProtectedActionsSecurityTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private GarageQuoteRequestRepository quoteRequestRepository;

    @Autowired
    private com.merigarage.reviews.repository.ServiceRepository serviceRepository;

    @Autowired
    private com.merigarage.reviews.repository.GarageServiceRepository garageServiceRepository;

    private Garage testGarage;
    private com.merigarage.reviews.domain.Service testService;
    private User customerUser;
    private User garageOwnerUser;
    private final String password = "Password123!";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // Create registered customer
        customerUser = userService.registerUser(new RegisterUserRequest(
                "customer." + suffix + "@example.com",
                password,
                "Rohan Customer",
                "9820011111",
                null,
                null,
                RoleName.ROLE_USER
        ));

        // Create registered garage owner
        garageOwnerUser = userService.registerUser(new RegisterUserRequest(
                "owner." + suffix + "@example.com",
                password,
                "Rajesh Garage Owner",
                "9820022222",
                null,
                null,
                RoleName.ROLE_GARAGE_OWNER
        ));

        // Create approved test garage
        testGarage = new Garage();
        testGarage.setName("Apex Motors " + suffix);
        testGarage.setSlug("apex-motors-" + suffix);
        testGarage.setCity("Mumbai");
        testGarage.setState("Maharashtra");
        testGarage.setAddressLine1("101 Link Road");
        testGarage.setPostalCode("400050");
        testGarage.setPhoneNumber("9820098200");
        testGarage.setApprovalStatus(GarageApprovalStatus.APPROVED);
        testGarage.setCreatedBy(garageOwnerUser);
        testGarage.setOwner(garageOwnerUser);
        testGarage = garageRepository.save(testGarage);

        List<com.merigarage.reviews.domain.Service> allServices = serviceRepository.findAll();
        testService = allServices.isEmpty()
                ? serviceRepository.save(new com.merigarage.reviews.domain.Service("Oil Change " + suffix, "oil-change-" + suffix, com.merigarage.reviews.domain.enums.ServiceCategory.PERIODIC_MAINTENANCE, "Engine oil service"))
                : allServices.get(0);

        com.merigarage.reviews.domain.GarageService gs = new com.merigarage.reviews.domain.GarageService(testGarage, testService, new java.math.BigDecimal("499.00"), true);
        garageServiceRepository.save(gs);
    }

    private MockHttpSession login(String email, String portal) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "email": "%s",
                                    "password": "%s",
                                    "portal": "%s"
                                }
                                """.formatted(email, password, portal)))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) res.getRequest().getSession(false);
    }

    @Test
    @DisplayName("Unauthenticated quote request submission is blocked by backend with 401 Unauthorized")
    void unauthenticatedQuoteRequest_BlockedWith401() throws Exception {
        long initialQuoteCount = quoteRequestRepository.count();

        String quoteBody = """
                {
                    "garageId": %d,
                    "serviceIds": [%d],
                    "vehicleType": "CAR",
                    "vehicleMake": "Maruti Suzuki",
                    "vehicleModel": "Swift",
                    "contactPhone": "9820011111",
                    "problemDescription": "Brake pads making screeching noise on stops"
                }
                """.formatted(testGarage.getId(), testService.getId());

        mockMvc.perform(post("/api/quote-requests")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(quoteBody))
                .andExpect(status().isUnauthorized());

        // Invariant: No quote was created
        assertThat(quoteRequestRepository.count()).isEqualTo(initialQuoteCount);
    }

    @Test
    @DisplayName("Authenticated customer can successfully submit quote request")
    void authenticatedCustomer_CanSubmitQuoteRequest() throws Exception {
        MockHttpSession session = login(customerUser.getEmail(), "customer");
        long initialQuoteCount = quoteRequestRepository.count();

        String quoteBody = """
                {
                    "garageId": %d,
                    "serviceIds": [%d],
                    "vehicleType": "CAR",
                    "vehicleMake": "Maruti Suzuki",
                    "vehicleModel": "Swift",
                    "contactPhone": "9820011111",
                    "problemDescription": "Brake pads making screeching noise on stops"
                }
                """.formatted(testGarage.getId(), testService.getId());

        mockMvc.perform(post("/api/quote-requests")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(quoteBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.referenceNumber").isNotEmpty());

        assertThat(quoteRequestRepository.count()).isEqualTo(initialQuoteCount + 1);
    }

    @Test
    @DisplayName("Unauthenticated review submission is blocked by backend with 401 Unauthorized")
    void unauthenticatedReview_BlockedWith401() throws Exception {
        long initialReviewCount = reviewRepository.count();

        String reviewBody = """
                {
                    "ratingServiceQuality": 5,
                    "ratingPricing": 4,
                    "ratingTimeline": 5,
                    "ratingCommunication": 4,
                    "reviewTitle": "Great experience",
                    "reviewText": "Prompt turnaround and polite mechanics."
                }
                """;

        mockMvc.perform(post("/api/garages/{garageId}/reviews", testGarage.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody))
                .andExpect(status().isUnauthorized());

        // Invariant: No review was created
        assertThat(reviewRepository.count()).isEqualTo(initialReviewCount);
    }

    @Test
    @DisplayName("Authenticated customer can successfully submit review")
    void authenticatedCustomer_CanSubmitReview() throws Exception {
        MockHttpSession session = login(customerUser.getEmail(), "customer");
        long initialReviewCount = reviewRepository.count();

        String reviewBody = """
                {
                    "ratingServiceQuality": 5,
                    "ratingPricing": 4,
                    "ratingTimeline": 5,
                    "ratingCommunication": 4,
                    "reviewTitle": "Great experience",
                    "reviewText": "Prompt turnaround and polite mechanics."
                }
                """;

        mockMvc.perform(post("/api/garages/{garageId}/reviews", testGarage.getId())
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.authorFullName").value("Rohan Customer"));

        assertThat(reviewRepository.count()).isEqualTo(initialReviewCount + 1);
    }

    @Test
    @DisplayName("Cross-portal login restriction: Vehicle owner attempting Garage Login is blocked with 403 Forbidden")
    void customerAttemptingGaragePortalLogin_BlockedWith403() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "email": "%s",
                                    "password": "%s",
                                    "portal": "garage"
                                }
                                """.formatted(customerUser.getEmail(), password)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("It seems like you are a customer. Please log in through the Customer Portal."));
    }

    @Test
    @DisplayName("Cross-portal login restriction: Garage owner attempting Customer Login is blocked with 403 Forbidden")
    void garageOwnerAttemptingCustomerPortalLogin_BlockedWith403() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "email": "%s",
                                    "password": "%s",
                                    "portal": "customer"
                                }
                                """.formatted(garageOwnerUser.getEmail(), password)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("It seems like you are a garage owner. Please log in using Garage Login."));
    }

    @Test
    @DisplayName("Invalid credentials do not succeed and return safe 401 error message")
    void invalidCredentials_Return401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "email": "%s",
                                    "password": "WrongPassword!",
                                    "portal": "customer"
                                }
                                """.formatted(customerUser.getEmail())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }
}
