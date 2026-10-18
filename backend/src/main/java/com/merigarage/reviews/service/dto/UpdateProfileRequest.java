package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 100) String fullName,
        @Size(max = 20) String phoneNumber,
        @Size(max = 500) String profilePhotoUrl,
        @Size(min = 8, max = 100) String currentPassword,
        @Size(min = 8, max = 100) String newPassword
) {
}
