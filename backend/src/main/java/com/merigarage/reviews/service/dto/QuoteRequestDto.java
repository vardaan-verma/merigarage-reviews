package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageQuoteRequest;
import com.merigarage.reviews.domain.enums.QuoteRequestStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

public record QuoteRequestDto(
        Long id,
        String referenceNumber,
        Long garageId,
        String garageName,
        String garageSlug,
        String garageCity,
        Long customerUserId,
        String customerName,
        String customerEmail,
        String vehicleType,
        String vehicleMake,
        String vehicleModel,
        Integer vehicleYear,
        String fuelType,
        String registrationNumber,
        Integer odometerReading,
        String problemDescription,
        String customerMessage,
        String contactPhone,
        String contactEmail,
        LocalDate preferredDate,
        BigDecimal estimatedMinPrice,
        BigDecimal estimatedMaxPrice,
        BigDecimal proposedQuoteAmount,
        String ownerNotes,
        QuoteRequestStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<ServiceDto> services,
        List<QuoteRequestMessageDto> messages
) {
    public static QuoteRequestDto fromEntity(GarageQuoteRequest request) {
        if (request == null) return null;

        List<ServiceDto> serviceDtos = request.getServices() != null
                ? request.getServices().stream().map(ServiceDto::fromEntity).toList()
                : Collections.emptyList();

        List<QuoteRequestMessageDto> messageDtos = request.getMessages() != null
                ? request.getMessages().stream().map(QuoteRequestMessageDto::fromEntity).toList()
                : Collections.emptyList();

        return new QuoteRequestDto(
                request.getId(),
                request.getReferenceNumber(),
                request.getGarage() != null ? request.getGarage().getId() : null,
                request.getGarage() != null ? request.getGarage().getName() : null,
                request.getGarage() != null ? request.getGarage().getSlug() : null,
                request.getGarage() != null ? request.getGarage().getCity() : null,
                request.getCustomerUser() != null ? request.getCustomerUser().getId() : null,
                request.getCustomerUser() != null ? request.getCustomerUser().getFullName() : null,
                request.getCustomerUser() != null ? request.getCustomerUser().getEmail() : null,
                request.getVehicleType(),
                request.getVehicleMake(),
                request.getVehicleModel(),
                request.getVehicleYear(),
                request.getFuelType(),
                request.getRegistrationNumber(),
                request.getOdometerReading(),
                request.getProblemDescription(),
                request.getCustomerMessage(),
                request.getContactPhone(),
                request.getContactEmail(),
                request.getPreferredDate(),
                request.getEstimatedMinPrice(),
                request.getEstimatedMaxPrice(),
                request.getProposedQuoteAmount(),
                request.getOwnerNotes(),
                request.getStatus(),
                request.getCreatedAt(),
                request.getUpdatedAt(),
                serviceDtos,
                messageDtos
        );
    }
}
