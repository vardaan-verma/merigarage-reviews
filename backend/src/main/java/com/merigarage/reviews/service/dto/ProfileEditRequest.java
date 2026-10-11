package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProfileEditRequest(
        @NotBlank @Size(max = 150) String proposedName,
        String proposedDescription,
        @NotBlank @Size(max = 255) String proposedAddressLine1,
        @Size(max = 255) String proposedAddressLine2,
        @NotBlank @Size(max = 100) String proposedCity,
        @NotBlank @Size(max = 100) String proposedState,
        @NotBlank @Size(max = 20) String proposedPostalCode,
        @NotBlank @Size(max = 20) String proposedPhoneNumber,
        @Size(max = 255) String proposedEmail,
        @Size(max = 255) String proposedWebsiteUrl,
        BigDecimal proposedLatitude,
        BigDecimal proposedLongitude
) {}
