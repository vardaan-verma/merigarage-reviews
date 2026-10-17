package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ManagePermissionRequest(
        @NotNull(message = "Permission code is required")
        AdminPermissionCode permission,

        @NotBlank(message = "Action must be GRANT or REVOKE")
        String action
) {}
