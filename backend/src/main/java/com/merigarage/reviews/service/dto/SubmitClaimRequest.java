package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmitClaimRequest(
        @NotBlank @Size(max = 2000) String claimMessage,
        @Size(max = 150) String claimantName,
        @Size(max = 30) String claimantPhone,
        @Size(max = 150) String claimantEmail,
        @Size(max = 100) String businessRegNumber
) {
    public SubmitClaimRequest(String claimMessage) {
        this(claimMessage, null, null, null, null);
    }
}
