package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.Service;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.ServiceCategory;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.GarageServiceRepository;
import com.merigarage.reviews.repository.ServiceRepository;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class QuoteRequestControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private GarageServiceRepository garageServiceRepository;

    private static final String PASSWORD = "Password123!";
    private User customer;
    private Garage garage;
    private Service service;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        customer = userService.registerUser(new RegisterUserRequest(
                "customer." + suffix + "@example.com", PASSWORD, "Test Customer", "9876543210"
        ));

        User owner = userService.registerUser(new RegisterUserRequest(
                "owner." + suffix + "@example.com", PASSWORD, "Test Owner", "9876543211"
        ));

        garage = garageService.createGarage(new CreateGarageRequest(
                "Quote Test Garage " + suffix, "Quality repair shop", "10 Market St", null,
                "Delhi", "Delhi", "110001", "9876543211",
                "garage." + suffix + "@example.com", null, null, null
        ), owner);
        garage.setApprovalStatus(GarageApprovalStatus.APPROVED);
        garageRepository.save(garage);

        service = new Service("General Service " + suffix, "gen-svc-" + suffix, ServiceCategory.PERIODIC_MAINTENANCE, "Full service");
        serviceRepository.save(service);

        com.merigarage.reviews.domain.GarageService gs = new com.merigarage.reviews.domain.GarageService(
                garage, service, new BigDecimal("2500.00"), true
        );
        garageServiceRepository.save(gs);
    }

    private MockHttpSession login(String email) throws Exception {
        String loginJson = """
                {"email": "%s", "password": "%s"}
                """.formatted(email, PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();

        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void createQuoteRequest_ValidRequest_Returns201Created() throws Exception {
        MockHttpSession session = login(customer.getEmail());

        String payload = """
                {
                    "garageId": %d,
                    "serviceIds": [%d],
                    "vehicleType": "CAR",
                    "vehicleMake": "Hyundai",
                    "vehicleModel": "i20",
                    "vehicleYear": 2021,
                    "fuelType": "PETROL",
                    "registrationNumber": "DL01AB1234",
                    "odometerReading": 25000,
                    "problemDescription": "Routine annual service needed",
                    "contactPhone": "9876543210",
                    "contactEmail": "%s"
                }
                """.formatted(garage.getId(), service.getId(), customer.getEmail());

        mockMvc.perform(post("/api/quote-requests")
                        .with(csrf())
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.referenceNumber").isNotEmpty())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.vehicleMake").value("Hyundai"))
                .andExpect(jsonPath("$.registrationNumber").value("DL01AB1234"));
    }

    @Test
    void createQuoteRequest_With50CharRegistrationNumber_Returns201Created() throws Exception {
        MockHttpSession session = login(customer.getEmail());

        String reg50 = "IND-DL01AB1234-SPECIAL-CUSTOM-REGISTRATION-SERIES-";

        String payload = """
                {
                    "garageId": %d,
                    "serviceIds": [%d],
                    "vehicleType": "CAR",
                    "vehicleMake": "Hyundai",
                    "vehicleModel": "i20",
                    "registrationNumber": "%s",
                    "problemDescription": "Check clutch and brakes",
                    "contactPhone": "9876543210"
                }
                """.formatted(garage.getId(), service.getId(), reg50);

        mockMvc.perform(post("/api/quote-requests")
                        .with(csrf())
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registrationNumber").value(reg50));
    }

    @Test
    void createQuoteRequest_OversizedRegistrationNumber_Returns400BadRequest() throws Exception {
        MockHttpSession session = login(customer.getEmail());

        String reg51 = "A".repeat(51);

        String payload = """
                {
                    "garageId": %d,
                    "serviceIds": [%d],
                    "vehicleType": "CAR",
                    "vehicleMake": "Hyundai",
                    "vehicleModel": "i20",
                    "registrationNumber": "%s",
                    "problemDescription": "Check clutch and brakes",
                    "contactPhone": "9876543210"
                }
                """.formatted(garage.getId(), service.getId(), reg51);

        mockMvc.perform(post("/api/quote-requests")
                        .with(csrf())
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    void createQuoteRequest_WithoutOptionalFields_Succeeds() throws Exception {
        MockHttpSession session = login(customer.getEmail());

        // vehicleYear, fuelType, registrationNumber, odometerReading, customerMessage, contactEmail, preferredDate omitted
        String payload = """
                {
                    "garageId": %d,
                    "serviceIds": [%d],
                    "vehicleType": "CAR",
                    "vehicleMake": "Maruti",
                    "vehicleModel": "Swift",
                    "problemDescription": "Basic brake check",
                    "contactPhone": "9876543210"
                }
                """.formatted(garage.getId(), service.getId());

        mockMvc.perform(post("/api/quote-requests")
                        .with(csrf())
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.referenceNumber").isNotEmpty())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void createQuoteRequest_Unauthenticated_Returns401Unauthorized() throws Exception {
        String payload = """
                {
                    "garageId": %d,
                    "serviceIds": [%d],
                    "vehicleType": "CAR",
                    "vehicleMake": "Maruti",
                    "vehicleModel": "Swift",
                    "problemDescription": "Basic check",
                    "contactPhone": "9876543210"
                }
                """.formatted(garage.getId(), service.getId());

        mockMvc.perform(post("/api/quote-requests")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }
}
