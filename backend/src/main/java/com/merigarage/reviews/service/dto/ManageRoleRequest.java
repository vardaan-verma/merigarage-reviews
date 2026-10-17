package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.RoleName;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ManageRoleRequest(
        @NotNull(message = "Role name is required")
        RoleName role,

        @NotBlank(message = "Action must be GRANT or REVOKE")
        String action
) {}
