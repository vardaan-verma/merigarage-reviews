package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.UserStatus;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.repository.UserRoleRepository;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void registerUser_NormalizesEmail_HashesPassword_AndAssignsDefaultRoleUser() {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String rawEmail = "  TestUser." + unique + "@Example.COM  ";
        String rawPassword = "SecurePassword123!";

        RegisterUserRequest request = new RegisterUserRequest(
                rawEmail,
                rawPassword,
                "John Doe",
                "9876543210"
        );

        User registered = userService.registerUser(request);

        assertThat(registered.getId()).isNotNull();
        assertThat(registered.getEmail()).isEqualTo("testuser." + unique.toLowerCase() + "@example.com");
        assertThat(registered.getFullName()).isEqualTo("John Doe");
        assertThat(registered.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(passwordEncoder.matches(rawPassword, registered.getPasswordHash())).isTrue();

        List<UserRole> roles = userRoleRepository.findByUserId(registered.getId());
        assertThat(roles).hasSize(1);
        assertThat(roles.get(0).getRole().getName()).isEqualTo(RoleName.ROLE_USER);
    }

    @Test
    void registerUser_RejectsDuplicateEmail_CaseInsensitively() {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String email = "dup." + unique + "@example.com";

        RegisterUserRequest request1 = new RegisterUserRequest(
                email,
                "Password123!",
                "First User",
                null
        );
        userService.registerUser(request1);

        RegisterUserRequest request2 = new RegisterUserRequest(
                "  DUP." + unique + "@EXAMPLE.COM  ",
                "AnotherPassword123!",
                "Second User",
                null
        );

        assertThatThrownBy(() -> userService.registerUser(request2))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("User already exists with email");
    }
}
