package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.UserStatus;
import com.merigarage.reviews.security.UserPrincipal;

import java.util.Set;
import java.util.stream.Collectors;

public record UserDto(
        Long id,
        String email,
        String fullName,
        String phoneNumber,
        String profilePhotoUrl,
        UserStatus status,
        Set<String> roles,
        Set<String> permissions
) {
    public static UserDto fromPrincipal(UserPrincipal principal) {
        return new UserDto(
                principal.getId(),
                principal.getEmail(),
                principal.getFullName(),
                principal.getPhoneNumber(),
                principal.getProfilePhotoUrl(),
                principal.getStatus(),
                principal.getRoles().stream().map(Enum::name).collect(Collectors.toSet()),
                principal.getPermissions().stream().map(Enum::name).collect(Collectors.toSet())
        );
    }

    public static UserDto fromEntity(User user, Set<RoleName> roles, Set<AdminPermissionCode> permissions) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getProfilePhotoUrl(),
                user.getStatus(),
                roles != null ? roles.stream().map(Enum::name).collect(Collectors.toSet()) : Set.of(),
                permissions != null ? permissions.stream().map(Enum::name).collect(Collectors.toSet()) : Set.of()
        );
    }
}
