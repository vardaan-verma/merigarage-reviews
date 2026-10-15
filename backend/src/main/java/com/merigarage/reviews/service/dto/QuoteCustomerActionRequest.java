package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;

public record QuoteCustomerActionRequest(
        @NotBlank(message = "Action is required (ACCEPT, DECLINE, CANCEL)")
        String action,

        String notes
) {}
