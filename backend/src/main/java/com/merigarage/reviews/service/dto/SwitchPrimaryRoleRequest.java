package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.RoleName;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SwitchPrimaryRoleRequest(
        @NotNull RoleName targetRole,
        @Size(max = 500) String reason
) {
}
