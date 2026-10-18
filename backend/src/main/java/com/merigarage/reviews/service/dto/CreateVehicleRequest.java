package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateVehicleRequest(
        @NotBlank @Size(max = 50) String vehicleType,
        @NotBlank @Size(max = 100) String make,
        @NotBlank @Size(max = 100) String model,
        Integer year,
        @Size(max = 50) String registrationNumber,
        @Size(max = 50) String fuelType
) {
}
