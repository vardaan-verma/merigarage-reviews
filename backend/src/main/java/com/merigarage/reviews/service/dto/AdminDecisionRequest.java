package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminDecisionRequest(
        @NotBlank @Size(max = 1000) String notes
) {}
