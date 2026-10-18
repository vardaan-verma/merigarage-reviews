package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterUserRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(max = 100) String fullName,
        @Size(max = 20) String phoneNumber,
        @Size(max = 100) String registrationSource,
        @Size(max = 50) String consentStatus,
        RoleName role,
        @Size(max = 64) String sessionId
) {
    public RegisterUserRequest(String email, String password, String fullName, String phoneNumber) {
        this(email, password, fullName, phoneNumber, null, null, null, null);
    }

    public RegisterUserRequest(String email, String password, String fullName, String phoneNumber, String registrationSource, String consentStatus) {
        this(email, password, fullName, phoneNumber, registrationSource, consentStatus, null, null);
    }

    public RegisterUserRequest(String email, String password, String fullName, String phoneNumber, String registrationSource, String consentStatus, RoleName role) {
        this(email, password, fullName, phoneNumber, registrationSource, consentStatus, role, null);
    }
}
