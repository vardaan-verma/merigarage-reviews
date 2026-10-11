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

    public UserPrincipal getRequiredPrincipal() {
        return getCurrentPrincipal()
                .orElseThrow(() -> new ForbiddenOperationException("Authentication is required for this operation."));
    }

    public User getRequiredCurrentUser() {
        UserPrincipal principal = getRequiredPrincipal();
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found with id: " + principal.getId()));
    }

    public Long getRequiredCurrentUserId() {
        return getRequiredPrincipal().getId();
    }

    public boolean hasRole(RoleName roleName) {
        return getCurrentPrincipal()
                .map(p -> p.hasRole(roleName))
                .orElse(false);
    }

    public boolean hasAdminPermission(AdminPermissionCode permissionCode) {
        return getCurrentPrincipal()
                .map(p -> p.hasAdminPermission(permissionCode))
                .orElse(false);
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
