package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmitClaimRequest(
        @NotBlank @Size(max = 2000) String claimMessage
) {}
