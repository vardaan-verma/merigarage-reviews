package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record CreateQuoteRequest(
        @NotNull(message = "Garage ID is required")
        Long garageId,

        @NotEmpty(message = "At least one service must be selected")
        List<Integer> serviceIds,

        @NotBlank(message = "Vehicle type is required")
        String vehicleType,

        @NotBlank(message = "Vehicle make is required")
        String vehicleMake,

        @NotBlank(message = "Vehicle model is required")
        String vehicleModel,

        Integer vehicleYear,
        String fuelType,
        String registrationNumber,
        Integer odometerReading,

        @NotBlank(message = "Problem description is required")
        String problemDescription,

        String customerMessage,

        @NotBlank(message = "Contact phone is required")
        String contactPhone,

        String contactEmail,
        LocalDate preferredDate
) {}
