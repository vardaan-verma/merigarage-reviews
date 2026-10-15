package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GaragePhoto;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.ServiceCategory;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.service.GarageMediaService;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.ServiceCatalogueService;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.CreateServiceRequest;
import com.merigarage.reviews.service.dto.PhotoUploadRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import com.merigarage.reviews.service.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PublicGarageControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private GarageMediaService mediaService;

    @Autowired
    private ServiceCatalogueService catalogueService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private GarageRepository garageRepository;

    private User adminUser;
    private User normalUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        adminUser = userService.registerUser(new RegisterUserRequest("admin." + suffix + "@test.com", "Password123!", "Admin User", null));
        normalUser = userService.registerUser(new RegisterUserRequest("user." + suffix + "@test.com", "Password123!", "Normal User", null));
    }

    @Test
    void listApprovedGarages_OnlyReturnsApprovedGaragesWithPagination() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Create and approve garage A
        Garage garageA = garageService.createGarage(new CreateGarageRequest(
                "Approved Auto " + suffix, "Description A", "123 Main St", null,
                "Mumbai", "Maharashtra", "400001", "9876543210",
                "auto." + suffix + "@example.com", null, null, null
        ), normalUser);
        garageService.approveGarage(garageA.getId(), adminUser, "Approved for testing");

        // 2. Create pending garage B (NOT approved)
        garageService.createGarage(new CreateGarageRequest(
                "Pending Garage " + suffix, "Description B", "456 Side St", null,
                "Mumbai", "Maharashtra", "400001", "9876543211",
                "pending." + suffix + "@example.com", null, null, null
        ), normalUser);

        // Query public discovery
        mockMvc.perform(get("/api/garages")
                        .param("city", "Mumbai")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[?(@.name == 'Approved Auto " + suffix + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.name == 'Pending Garage " + suffix + "')]").doesNotExist())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10));
    }

    @Test
    void getApprovedGarageBySlug_Success_ExposesApprovedPhotosAndActiveServicesOnly() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        Garage garage = garageService.createGarage(new CreateGarageRequest(
                "Elite Motors " + suffix, "Elite description", "100 Highway Rd", null,
                "Delhi", "Delhi", "110001", "9123456780",
                "elite." + suffix + "@example.com", "https://elite.example.com",
                new BigDecimal("28.6139000"), new BigDecimal("77.2090000")
        ), normalUser);
        garageService.approveGarage(garage.getId(), adminUser, "Approved");

        // Add photo via storage
        MockMultipartFile photoFile = new MockMultipartFile("file", "car.jpg", "image/jpeg", "image content".getBytes());
        String storageKey = fileStorageService.storePhoto(photoFile, garage.getId());
        GaragePhoto photo = mediaService.addPhoto(garage.getId(), new PhotoUploadRequest(
                storageKey, "image/jpeg", (long) photoFile.getSize(), "Front View", (byte) 1, true
        ), normalUser);

        // Add service
        com.merigarage.reviews.domain.Service service = catalogueService.createService(new CreateServiceRequest(
                "Oil Change " + suffix, ServiceCategory.PERIODIC_MAINTENANCE, "Synthetic oil change", (short) 1, true
        ), adminUser);
        catalogueService.associateServiceWithGarage(garage.getId(), service.getId(), new BigDecimal("1500.00"), true);

        // Retrieve by slug
        mockMvc.perform(get("/api/garages/{slug}", garage.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Elite Motors " + suffix))
                .andExpect(jsonPath("$.slug").value(garage.getSlug()))
                .andExpect(jsonPath("$.city").value("Delhi"))
                .andExpect(jsonPath("$.coverPhotoId").value(photo.getId()))
                .andExpect(jsonPath("$.photos[0].id").value(photo.getId()))
                .andExpect(jsonPath("$.photos[0].caption").value("Front View"))
                .andExpect(jsonPath("$.photos[0].storageKey").doesNotExist()) // Never expose storageKey
                .andExpect(jsonPath("$.services[0].serviceName").value("Oil Change " + suffix))
                .andExpect(jsonPath("$.services[0].startingPrice").value(1500.00))
                .andExpect(jsonPath("$.documents").doesNotExist()) // Never expose private documents
                .andExpect(jsonPath("$.audits").doesNotExist()); // Never expose audit history
    }

    @Test
    void getApprovedGarageBySlug_UnapprovedGarage_Returns404() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        Garage garage = garageService.createGarage(new CreateGarageRequest(
                "Secret Garage " + suffix, "Secret", "123 Hidden Lane", null,
                "Pune", "Maharashtra", "411001", "9000000000",
                null, null, null, null
        ), normalUser);

        // Remains in PENDING status - public lookup must fail with 404
        mockMvc.perform(get("/api/garages/{slug}", garage.getSlug()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Garage listing is not publicly visible."));
    }

    @Test
    void listApprovedGarages_FilteredByServiceSlug_ReturnsOnlyMatchingGaragesAndExcludesPending() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Create a service
        com.merigarage.reviews.domain.Service service = catalogueService.createService(new CreateServiceRequest(
                "Brake Overhaul " + suffix, ServiceCategory.MECHANICAL_REPAIR, "Full brake maintenance", (short) 1, true
        ), adminUser);

        // 2. Create Approved Garage offering the service
        Garage approvedMatching = garageService.createGarage(new CreateGarageRequest(
                "Brake Master " + suffix, "Brake specialists", "10 Brake Way", null,
                "Jaipur", "Rajasthan", "302001", "9876543210",
                "brake." + suffix + "@example.com", null, null, null
        ), normalUser);
        catalogueService.associateServiceWithGarage(approvedMatching.getId(), service.getId(), new BigDecimal("1200"), true);
        garageService.approveGarage(approvedMatching.getId(), adminUser, "Approved");

        // 3. Create Approved Garage NOT offering the service
        Garage approvedOther = garageService.createGarage(new CreateGarageRequest(
                "Tyre Only " + suffix, "Tyre specialists", "20 Tyre Way", null,
                "Jaipur", "Rajasthan", "302001", "9876543211",
                "tyre." + suffix + "@example.com", null, null, null
        ), normalUser);
        garageService.approveGarage(approvedOther.getId(), adminUser, "Approved");

        // 4. Create Pending Garage offering the service (must NOT appear in public results)
        Garage pendingOffering = garageService.createGarage(new CreateGarageRequest(
                "Pending Brake Shop " + suffix, "Pending brake shop", "30 Brake Way", null,
                "Jaipur", "Rajasthan", "302001", "9876543212",
                "pendingbrake." + suffix + "@example.com", null, null, null
        ), normalUser);
        catalogueService.associateServiceWithGarage(pendingOffering.getId(), service.getId(), new BigDecimal("1000"), true);

        // Query public garages with serviceSlug
        mockMvc.perform(get("/api/garages")
                        .param("serviceSlug", service.getSlug())
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.name == 'Brake Master " + suffix + "')]").exists())
                .andExpect(jsonPath("$.content[?(@.name == 'Tyre Only " + suffix + "')]").doesNotExist())
                .andExpect(jsonPath("$.content[?(@.name == 'Pending Brake Shop " + suffix + "')]").doesNotExist());
    }
}
