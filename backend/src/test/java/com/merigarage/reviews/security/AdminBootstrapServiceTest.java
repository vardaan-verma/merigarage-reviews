package com.merigarage.reviews.security;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.UserStatus;
import com.merigarage.reviews.repository.AdminPermissionRepository;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserAdminPermissionRepository;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminBootstrapServiceTest {

    @Autowired
    private AdminBootstrapService bootstrapService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private AdminPermissionRepository permissionRepository;

    @Autowired
    private UserAdminPermissionRepository userPermissionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        userPermissionRepository.deleteAll();
        userRoleRepository.deleteAll();
    }

    @Test
    void bootstrapAdmin_CreatesFirstAdmin_WithAllPermissions_AndSkipsRepeatedExecution() {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String adminEmail = "bootstrap." + unique + "@example.com";
        String rawPassword = "BootstrapSecret123!";

        ReflectionTestUtils.setField(bootstrapService, "adminEmail", adminEmail);
        ReflectionTestUtils.setField(bootstrapService, "adminPassword", rawPassword);
        ReflectionTestUtils.setField(bootstrapService, "adminName", "Root Admin");

        // 1. Initial execution
        boolean result1 = bootstrapService.bootstrapAdmin();
        assertThat(result1).isTrue();

        User admin = userRepository.findByEmail(adminEmail).orElseThrow();
        assertThat(admin.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(passwordEncoder.matches(rawPassword, admin.getPasswordHash())).isTrue();

        var roles = userRoleRepository.findByUserId(admin.getId());
        assertThat(roles).anyMatch(r -> r.getRole().getName() == RoleName.ROLE_ADMIN);

        var perms = userPermissionRepository.findByUserId(admin.getId());
        assertThat(perms).hasSize(AdminPermissionCode.values().length);
        for (AdminPermissionCode code : AdminPermissionCode.values()) {
            assertThat(perms).anyMatch(p -> p.getPermission().getCode() == code);
        }

        // 2. Repeated execution skips gracefully
        boolean result2 = bootstrapService.bootstrapAdmin();
        assertThat(result2).isFalse();
    }
}
