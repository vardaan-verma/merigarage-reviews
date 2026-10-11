package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.ServiceCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateServiceRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull ServiceCategory category,
        String description,
        Short displayOrder,
        Boolean isActive
) {}
