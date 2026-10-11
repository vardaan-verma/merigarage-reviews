package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.service.UserService;
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

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserProfileControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    private static final String PASSWORD = "Password123!";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
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
    void getProfile_Anonymous_Returns401() throws Exception {
        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProfile_Authenticated_ReturnsCurrentUserProfile() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "profile." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "Profile User", "9876543210"));

        MockHttpSession session = login(email);

        mockMvc.perform(get("/api/users/profile").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.fullName").value("Profile User"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }
}
