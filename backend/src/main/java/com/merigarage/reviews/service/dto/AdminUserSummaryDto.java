package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.UserStatus;

import java.time.LocalDateTime;
import java.util.List;

public record AdminUserSummaryDto(
        Long id,
        String fullName,
        String email,
        String phoneNumber,
        String profilePhotoUrl,
        List<String> roles,
        List<String> permissions,
        UserStatus status,
        String registrationSource,
        String consentStatus,
        LocalDateTime emailVerifiedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        int linkedGaragesCount,
        int quoteRequestsCount
) {
    public AdminUserSummaryDto(
            Long id,
            String fullName,
            String email,
            String phoneNumber,
            List<String> roles,
            List<String> permissions,
            UserStatus status,
            String registrationSource,
            String consentStatus,
            LocalDateTime emailVerifiedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            int linkedGaragesCount,
            int quoteRequestsCount
    ) {
        this(id, fullName, email, phoneNumber, null, roles, permissions, status, registrationSource, consentStatus, emailVerifiedAt, createdAt, updatedAt, linkedGaragesCount, quoteRequestsCount);
    }

    public static AdminUserSummaryDto fromUser(
            User user,
            List<String> roles,
            List<String> permissions,
            int linkedGaragesCount,
            int quoteRequestsCount
    ) {
        return new AdminUserSummaryDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getProfilePhotoUrl(),
                roles,
                permissions,
                user.getStatus(),
                user.getRegistrationSource(),
                user.getConsentStatus(),
                user.getEmailVerifiedAt(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                linkedGaragesCount,
                quoteRequestsCount
        );
    }
}
