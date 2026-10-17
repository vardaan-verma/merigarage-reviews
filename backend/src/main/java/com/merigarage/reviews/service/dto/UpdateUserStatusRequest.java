package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.UserStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateUserStatusRequest(
        @NotNull(message = "Target status is required")
        UserStatus status,

        @NotBlank(message = "Reason for status change is required")
        @Size(max = 500, message = "Reason cannot exceed 500 characters")
        String reason
) {
}
