package com.merigarage.reviews.security;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.UserStatus;
import com.merigarage.reviews.repository.UserAdminPermissionRepository;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserAdminPermissionRepository userAdminPermissionRepository;

    public CustomUserDetailsService(UserRepository userRepository,
                                    UserRoleRepository userRoleRepository,
                                    UserAdminPermissionRepository userAdminPermissionRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.userAdminPermissionRepository = userAdminPermissionRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (email == null || email.isBlank()) {
            throw new UsernameNotFoundException("Email cannot be blank.");
        }

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + normalizedEmail));

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new LockedException("User account is suspended.");
        }
        if (user.getStatus() == UserStatus.DEACTIVATED) {
            throw new DisabledException("User account is deactivated.");
        }

        Set<RoleName> roles = userRoleRepository.findByUserId(user.getId()).stream()
                .map(ur -> ur.getRole().getName())
                .collect(Collectors.toSet());

        Set<AdminPermissionCode> permissions = userAdminPermissionRepository.findByUserId(user.getId()).stream()
                .map(uap -> uap.getPermission().getCode())
                .collect(Collectors.toSet());

        return new UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getFullName(),
                user.getStatus(),
                roles,
                permissions
        );
    }
}
