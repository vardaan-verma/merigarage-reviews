package com.merigarage.reviews.security;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class SecurityContextService {

    private final UserRepository userRepository;

    public SecurityContextService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<UserPrincipal> getCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    public Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        if (auth.getPrincipal() instanceof UserPrincipal principal) {
            return userRepository.findById(principal.getId());
        }
        String username = auth.getName();
        if (username != null && !username.isBlank()) {
            return userRepository.findByEmail(username);
        }
        return Optional.empty();
    }

    public UserPrincipal getRequiredPrincipal() {
        return getCurrentPrincipal()
                .orElseThrow(() -> new ForbiddenOperationException("Authentication is required for this operation."));
    }

    public User getRequiredCurrentUser() {
        return getCurrentUser()
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));
    }

    public Long getRequiredCurrentUserId() {
        return getCurrentPrincipal()
                .map(UserPrincipal::getId)
                .or(() -> getCurrentUser().map(User::getId))
                .orElseThrow(() -> new ForbiddenOperationException("Authentication is required for this operation."));
    }

    public boolean hasRole(RoleName roleName) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        if (auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.hasRole(roleName);
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(roleName.name()) || a.getAuthority().equals("ROLE_" + roleName.name()));
    }

    public boolean hasAdminPermission(AdminPermissionCode permissionCode) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        if (auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.hasAdminPermission(permissionCode);
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(permissionCode.name()));
    }

    public void requireRole(RoleName roleName) {
        if (!hasRole(roleName)) {
            throw new ForbiddenOperationException("Missing required role: " + roleName.name());
        }
    }

    public void requireAdminPermission(AdminPermissionCode permissionCode) {
        if (!hasAdminPermission(permissionCode)) {
            throw new ForbiddenOperationException("Missing required admin permission: " + permissionCode.name());
        }
    }
}
