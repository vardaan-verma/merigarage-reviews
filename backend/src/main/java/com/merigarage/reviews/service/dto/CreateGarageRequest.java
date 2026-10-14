package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateGarageRequest(
        @NotBlank @Size(max = 150) String name,
        String description,
        @NotBlank @Size(max = 255) String addressLine1,
        @Size(max = 255) String addressLine2,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String state,
        @NotBlank @Size(max = 20) String postalCode,
        @NotBlank @Size(max = 20) String phoneNumber,
        @Size(max = 255) String email,
        @Size(max = 255) String websiteUrl,
        @Size(max = 500) String googleMapsUrl,
        BigDecimal latitude,
        BigDecimal longitude
) {}
