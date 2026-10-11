package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.Service;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.ServiceCategory;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.repository.GarageServiceRepository;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.CreateServiceRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ServiceCatalogueServiceTest {

    @Autowired
    private ServiceCatalogueService catalogueService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private UserService userService;

    @Autowired
    private GarageServiceRepository garageServiceRepository;

    private User createTestUser(String prefix) {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        return userService.registerUser(new RegisterUserRequest(
                prefix + "." + uid + "@example.com",
                "Password123!",
                prefix + " User",
                "9876543210"
        ));
    }

    private Garage createTestGarage(User creator) {
        return garageService.createGarage(new CreateGarageRequest(
                "Service Test Garage " + UUID.randomUUID().toString().substring(0, 8),
                "Description",
                "Address 1",
                null,
                "Delhi",
                "Delhi",
                "110001",
                "+911122334455",
                null,
                null,
                null,
                null
        ), creator);
    }

    @Test
    void associateServiceWithGarage_RespectsActiveStatus_AndPreventsDuplicates() {
        User admin = createTestUser("admin");
        User creator = createTestUser("creator");
        Garage garage = createTestGarage(creator);

        // 1. Create active service
        Service activeService = catalogueService.createService(new CreateServiceRequest(
                "Full Oil Service " + UUID.randomUUID().toString().substring(0, 8),
                ServiceCategory.PERIODIC_MAINTENANCE,
                "Synthetic oil and filter replacement",
                (short) 1,
                true
        ), admin);

        // 2. Associate with garage
        com.merigarage.reviews.domain.GarageService association1 = catalogueService.associateServiceWithGarage(
                garage.getId(), activeService.getId(), new BigDecimal("1999.00"), true
        );
        assertThat(association1).isNotNull();
        assertThat(association1.getStartingPrice()).isEqualByComparingTo("1999.00");

        // 3. Re-associating same service must update without creating duplicate record
        com.merigarage.reviews.domain.GarageService association2 = catalogueService.associateServiceWithGarage(
                garage.getId(), activeService.getId(), new BigDecimal("2499.00"), true
        );
        assertThat(association2.getStartingPrice()).isEqualByComparingTo("2499.00");

        List<com.merigarage.reviews.domain.GarageService> associations = garageServiceRepository.findByGarageId(garage.getId());
        assertThat(associations).hasSize(1);

        // 4. Create inactive service
        Service inactiveService = catalogueService.createService(new CreateServiceRequest(
                "Discontinued Service " + UUID.randomUUID().toString().substring(0, 8),
                ServiceCategory.MECHANICAL_REPAIR,
                "Old service",
                (short) 2,
                false // Inactive!
        ), admin);

        // Associating inactive service must throw InvalidOperationException
        assertThatThrownBy(() -> catalogueService.associateServiceWithGarage(
                garage.getId(), inactiveService.getId(), new BigDecimal("500.00"), true
        )).isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("Cannot associate inactive catalogue service");
    }
}
