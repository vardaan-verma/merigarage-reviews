package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Vehicle;

import java.time.LocalDateTime;

public record VehicleDto(
        Long id,
        Long userId,
        String vehicleType,
        String make,
        String model,
        Integer year,
        String registrationNumber,
        String fuelType,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static VehicleDto fromEntity(Vehicle vehicle) {
        if (vehicle == null) return null;
        return new VehicleDto(
                vehicle.getId(),
                vehicle.getUser() != null ? vehicle.getUser().getId() : null,
                vehicle.getVehicleType(),
                vehicle.getMake(),
                vehicle.getModel(),
                vehicle.getYear(),
                vehicle.getRegistrationNumber(),
                vehicle.getFuelType(),
                vehicle.getCreatedAt(),
                vehicle.getUpdatedAt()
        );
    }
}
