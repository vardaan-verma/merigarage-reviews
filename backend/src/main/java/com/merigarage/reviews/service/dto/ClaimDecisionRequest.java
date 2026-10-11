package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClaimDecisionRequest(
        @NotBlank @Size(max = 1000) String decisionNotes
) {}
