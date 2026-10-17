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
