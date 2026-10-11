package com.merigarage.reviews.security;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.service.UserAuthorizationService;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthorizationSecurityTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private UserAuthorizationService authorizationService;

    @Autowired
    private SecurityContextService securityContextService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void userRole_CannotAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/test-protected/admin-only"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
    void adminRole_CanAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/test-protected/admin-only"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Admin access granted"));
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
    void adminWithoutGranularPermission_IsForbiddenFromGranularAction() throws Exception {
        // Admin has ROLE_ADMIN but NOT the granular GARAGE_APPROVAL authority
        mockMvc.perform(get("/api/test-protected/garage-approval-permission"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    @WithMockUser(username = "admin@example.com", authorities = {"ROLE_ADMIN", "GARAGE_APPROVAL"})
    void adminWithGranularPermission_CanAccessGranularAction() throws Exception {
        mockMvc.perform(get("/api/test-protected/garage-approval-permission"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Garage approval permission granted"));
    }

    @Test
    void clientControlledRoleEscalation_Prevented() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        User regularUser = userService.registerUser(new RegisterUserRequest(
                "regular." + uid + "@example.com",
                "Password123!",
                "Regular User",
                null
        ));

        // Regular user attempts to grant themselves ROLE_ADMIN
        assertThatThrownBy(() -> authorizationService.grantRole(regularUser.getId(), RoleName.ROLE_ADMIN, regularUser))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Only administrators can manage roles");

        // Regular user attempts to grant themselves GARAGE_APPROVAL permission
        assertThatThrownBy(() -> authorizationService.grantAdminPermission(regularUser.getId(), AdminPermissionCode.GARAGE_APPROVAL, regularUser))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Only administrators can manage roles");
    }

    @Test
    void securityContextService_CorrectlyResolvesCurrentDatabaseUser() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        User user = userService.registerUser(new RegisterUserRequest(
                "resolver." + uid + "@example.com",
                "Password123!",
                "Resolved User",
                null
        ));

        UserPrincipal principal = new UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getFullName(),
                user.getStatus(),
                Set.of(RoleName.ROLE_USER),
                Set.of()
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);

        try {
            User resolved = securityContextService.getRequiredCurrentUser();
            assertThat(resolved.getId()).isEqualTo(user.getId());
            assertThat(resolved.getEmail()).isEqualTo(user.getEmail());
            assertThat(securityContextService.hasRole(RoleName.ROLE_USER)).isTrue();
            assertThat(securityContextService.hasRole(RoleName.ROLE_ADMIN)).isFalse();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
