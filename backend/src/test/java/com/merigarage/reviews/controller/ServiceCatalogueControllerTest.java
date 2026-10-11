package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.ServiceCategory;
import com.merigarage.reviews.service.ServiceCatalogueService;
import com.merigarage.reviews.service.UserAuthorizationService;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.CreateServiceRequest;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ServiceCatalogueControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private UserAuthorizationService authorizationService;

    @Autowired
    private com.merigarage.reviews.repository.RoleRepository roleRepository;

    @Autowired
    private com.merigarage.reviews.repository.UserRoleRepository userRoleRepository;

    @Autowired
    private ServiceCatalogueService catalogueService;

    private User adminUser;
    private User regularUser;
    private static final String PASSWORD = "Password123!";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        adminUser = userService.registerUser(new RegisterUserRequest("admin." + suffix + "@test.com", PASSWORD, "Admin Cat", null));
        com.merigarage.reviews.domain.Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElseThrow();
        userRoleRepository.save(new com.merigarage.reviews.domain.UserRole(adminUser, adminRole));

        regularUser = userService.registerUser(new RegisterUserRequest("user." + suffix + "@test.com", PASSWORD, "Reg User", null));
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
    void listActiveServices_PublicAccess_ReturnsActiveServices() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        catalogueService.createService(new CreateServiceRequest(
                "Battery Check " + suffix, ServiceCategory.ELECTRICAL, "Check terminal and voltage", (short) 1, true
        ), adminUser);

        mockMvc.perform(get("/api/services"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.name == 'Battery Check " + suffix + "')]").exists());
    }

    @Test
    void createAndModifyService_AdminOnly_RegularUserDenied() throws Exception {
        MockHttpSession userSession = login(regularUser.getEmail());
        MockHttpSession adminSession = login(adminUser.getEmail());

        String createJson = """
                {
                    "name": "AC Disinfection",
                    "category": "MECHANICAL_REPAIR",
                    "description": "Antiviral AC treatment",
                    "isActive": true,
                    "displayOrder": 5
                }
                """;

        // Regular user denied -> 403
        mockMvc.perform(post("/api/admin/services")
                        .session(userSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isForbidden());

        // Admin create -> 201 Created
        MvcResult res = mockMvc.perform(post("/api/admin/services")
                        .session(adminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("AC Disinfection"))
                .andReturn();

        // Extract id and update
        Integer serviceId = com.jayway.jsonpath.JsonPath.read(res.getResponse().getContentAsString(), "$.id");

        String updateJson = """
                {
                    "name": "AC Disinfection & Cleaning",
                    "category": "MECHANICAL_REPAIR",
                    "description": "Full antiviral AC cleaning",
                    "isActive": true,
                    "displayOrder": 6
                }
                """;

        mockMvc.perform(put("/api/admin/services/{id}", serviceId)
                        .session(adminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("AC Disinfection & Cleaning"));
    }
}
