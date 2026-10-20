package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record CreateQuoteRequest(
        @NotNull(message = "Garage ID is required")
        Long garageId,

        @NotEmpty(message = "At least one service must be selected")
        List<Integer> serviceIds,

        @NotBlank(message = "Vehicle type is required")
        @Size(max = 50, message = "Vehicle type must not exceed 50 characters")
        String vehicleType,

        @NotBlank(message = "Vehicle make is required")
        @Size(max = 100, message = "Vehicle make must not exceed 100 characters")
        String vehicleMake,

        @NotBlank(message = "Vehicle model is required")
        @Size(max = 100, message = "Vehicle model must not exceed 100 characters")
        String vehicleModel,

        @Min(value = 1900, message = "Vehicle year must be 1900 or later")
        @Max(value = 2100, message = "Vehicle year is invalid")
        Integer vehicleYear,

        @Size(max = 50, message = "Fuel type must not exceed 50 characters")
        String fuelType,

        @Size(max = 50, message = "Registration number must not exceed 50 characters")
        String registrationNumber,

        @PositiveOrZero(message = "Odometer reading cannot be negative")
        Integer odometerReading,

        @NotBlank(message = "Problem description is required")
        @Size(max = 5000, message = "Problem description must not exceed 5000 characters")
        String problemDescription,

        @Size(max = 2000, message = "Customer message must not exceed 2000 characters")
        String customerMessage,

        @NotBlank(message = "Contact phone is required")
        @Size(max = 20, message = "Contact phone must not exceed 20 characters")
        String contactPhone,

        @Size(max = 255, message = "Contact email must not exceed 255 characters")
        String contactEmail,

        LocalDate preferredDate
) {}
