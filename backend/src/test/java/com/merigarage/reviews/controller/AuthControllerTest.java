package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.UserStatus;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void register_Success_Returns201AndStoresBcryptPassword() throws Exception {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String rawPassword = "Password123!";
        String jsonBody = """
                {
                    "email": "register.%s@example.com",
                    "password": "%s",
                    "fullName": "New User",
                    "phoneNumber": "9876543210"
                }
                """.formatted(unique, rawPassword);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.email").value("register." + unique + "@example.com"))
                .andExpect(jsonPath("$.fullName").value("New User"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        User user = userRepository.findByEmail("register." + unique + "@example.com").orElseThrow();
        assertThat(passwordEncoder.matches(rawPassword, user.getPasswordHash())).isTrue();
        assertThat(user.getPasswordHash()).doesNotContain(rawPassword);
    }

    @Test
    void login_Success_Returns200AndSetsSession() throws Exception {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String email = "login." + unique + "@example.com";
        String rawPassword = "Password123!";

        userService.registerUser(new RegisterUserRequest(email, rawPassword, "Login User", "9876543210"));

        String loginJson = """
                {
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(email, rawPassword);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"))
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();

        // Access /api/auth/me with session
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void login_InvalidPassword_ReturnsGeneric401() throws Exception {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String email = "wrongpass." + unique + "@example.com";
        userService.registerUser(new RegisterUserRequest(email, "Password123!", "Wrong User", null));

        String loginJson = """
                {
                    "email": "%s",
                    "password": "IncorrectPassword999!"
                }
                """.formatted(email);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void login_NonExistentEmail_ReturnsIdenticalGeneric401() throws Exception {
        String loginJson = """
                {
                    "email": "nonexistent.%s@example.com",
                    "password": "Password123!"
                }
                """.formatted(UUID.randomUUID());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void login_SuspendedAccount_ReturnsIdenticalGeneric401() throws Exception {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String email = "suspended." + unique + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, "Password123!", "Suspended User", null));

        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);

        String loginJson = """
                {
                    "email": "%s",
                    "password": "Password123!"
                }
                """.formatted(email);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void anonymousAccess_OnProtectedEndpoint_Returns401() throws Exception {
        mockMvc.perform(get("/api/test-protected/user-only"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void logout_InvalidatesSession() throws Exception {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String email = "logout." + unique + "@example.com";
        String rawPassword = "Password123!";

        userService.registerUser(new RegisterUserRequest(email, rawPassword, "Logout User", null));

        String loginJson = """
                {
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(email, rawPassword);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);
        assertThat(session).isNotNull();

        // Logout
        mockMvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logged out successfully."));

        assertThat(session.isInvalid()).isTrue();
    }
}
