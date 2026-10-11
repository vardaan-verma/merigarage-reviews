package com.merigarage.reviews.security;

import com.merigarage.reviews.domain.AdminPermission;
import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserAdminPermission;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.UserStatus;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.repository.AdminPermissionRepository;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserAdminPermissionRepository;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class AdminBootstrapService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AdminPermissionRepository permissionRepository;
    private final UserAdminPermissionRepository userPermissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-email:}")
    private String adminEmail;

    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;

    @Value("${app.bootstrap.admin-name:System Administrator}")
    private String adminName;

    public AdminBootstrapService(UserRepository userRepository,
                                 RoleRepository roleRepository,
                                 UserRoleRepository userRoleRepository,
                                 AdminPermissionRepository permissionRepository,
                                 UserAdminPermissionRepository userPermissionRepository,
                                 PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.permissionRepository = permissionRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        bootstrapAdmin();
    }

    @Transactional
    public boolean bootstrapAdmin() {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.info("Administrator bootstrap credentials not configured; skipping bootstrap.");
            return false;
        }

        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("Role ROLE_ADMIN not found in database."));

        // Check if an active administrator already exists
        List<UserRole> existingAdminRoles = userRoleRepository.findByRoleId(adminRole.getId());
        boolean hasActiveAdmin = existingAdminRoles.stream()
                .map(UserRole::getUser)
                .anyMatch(u -> u.getStatus() == UserStatus.ACTIVE);

        if (hasActiveAdmin) {
            log.info("Active administrator already exists in database; skipping bootstrap.");
            return false;
        }

        String normalizedEmail = adminEmail.trim().toLowerCase(Locale.ROOT);

        try {
            User adminUser;
            Optional<User> existingUserOpt = userRepository.findByEmail(normalizedEmail);
            if (existingUserOpt.isPresent()) {
                adminUser = existingUserOpt.get();
                if (adminUser.getStatus() != UserStatus.ACTIVE) {
                    adminUser.setStatus(UserStatus.ACTIVE);
                    userRepository.save(adminUser);
                }
            } else {
                adminUser = new User();
                adminUser.setEmail(normalizedEmail);
                adminUser.setPasswordHash(passwordEncoder.encode(adminPassword));
                adminUser.setFullName(adminName.trim());
                adminUser.setStatus(UserStatus.ACTIVE);
                adminUser = userRepository.saveAndFlush(adminUser);
            }

            // Assign ROLE_ADMIN if not already assigned
            if (!userRoleRepository.existsByUserIdAndRoleId(adminUser.getId(), adminRole.getId())) {
                userRoleRepository.saveAndFlush(new UserRole(adminUser, adminRole));
            }

            // Assign initial granular admin permissions
            for (AdminPermissionCode code : AdminPermissionCode.values()) {
                AdminPermission perm = permissionRepository.findByCode(code)
                        .orElseThrow(() -> new ResourceNotFoundException("Admin permission not found: " + code));
                if (!userPermissionRepository.existsByUserIdAndPermissionId(adminUser.getId(), perm.getId())) {
                    userPermissionRepository.saveAndFlush(new UserAdminPermission(adminUser, perm, adminUser));
                }
            }

            log.info("Initial administrator bootstrapped successfully for email: {}", normalizedEmail);
            return true;
        } catch (DataIntegrityViolationException ex) {
            log.warn("Concurrent initialization or unique constraint violation during admin bootstrap: {}", ex.getMessage());
            return false;
        }
    }
}
