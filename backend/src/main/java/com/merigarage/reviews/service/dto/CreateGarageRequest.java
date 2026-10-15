package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

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
        BigDecimal longitude,
        List<Integer> serviceIds
) {
    public CreateGarageRequest(
            String name,
            String description,
            String addressLine1,
            String addressLine2,
            String city,
            String state,
            String postalCode,
            String phoneNumber,
            String email,
            String websiteUrl,
            String googleMapsUrl,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        this(name, description, addressLine1, addressLine2, city, state, postalCode, phoneNumber, email, websiteUrl, googleMapsUrl, latitude, longitude, List.of());
    }

    public CreateGarageRequest(
            String name,
            String description,
            String addressLine1,
            String addressLine2,
            String city,
            String state,
            String postalCode,
            String phoneNumber,
            String email,
            String websiteUrl,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        this(name, description, addressLine1, addressLine2, city, state, postalCode, phoneNumber, email, websiteUrl, null, latitude, longitude, List.of());
    }
}
