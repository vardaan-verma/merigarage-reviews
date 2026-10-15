package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record QuoteOwnerResponseRequest(
        @NotBlank(message = "Action is required (REVIEW, QUOTE, DECLINE, COMPLETE)")
        String action,

        BigDecimal proposedQuoteAmount,

        String ownerNotes
) {}
