package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageQuoteRequest;
import com.merigarage.reviews.domain.enums.QuoteRequestStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

public record AdminQuoteSummaryDto(
        Long id,
        String referenceNumber,
        Long garageId,
        String garageName,
        String garageCity,
        Long customerUserId,
        String customerName,
        String customerEmail,
        String contactPhone,
        String vehicleType,
        String vehicleMake,
        String vehicleModel,
        Integer vehicleYear,
        String problemDescription,
        List<String> serviceNames,
        BigDecimal estimatedMinPrice,
        BigDecimal proposedQuoteAmount,
        String ownerNotes,
        QuoteRequestStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        int messagesCount
) {
    public static AdminQuoteSummaryDto fromEntity(GarageQuoteRequest req) {
        if (req == null) return null;

        List<String> serviceNames = req.getServices() != null
                ? req.getServices().stream().map(com.merigarage.reviews.domain.Service::getName).toList()
                : Collections.emptyList();

        int messagesCount = req.getMessages() != null ? req.getMessages().size() : 0;

        return new AdminQuoteSummaryDto(
                req.getId(),
                req.getReferenceNumber(),
                req.getGarage() != null ? req.getGarage().getId() : null,
                req.getGarage() != null ? req.getGarage().getName() : null,
                req.getGarage() != null ? req.getGarage().getCity() : null,
                req.getCustomerUser() != null ? req.getCustomerUser().getId() : null,
                req.getCustomerUser() != null ? req.getCustomerUser().getFullName() : null,
                req.getCustomerUser() != null ? req.getCustomerUser().getEmail() : null,
                req.getContactPhone(),
                req.getVehicleType(),
                req.getVehicleMake(),
                req.getVehicleModel(),
                req.getVehicleYear(),
                req.getProblemDescription(),
                serviceNames,
                req.getEstimatedMinPrice(),
                req.getProposedQuoteAmount(),
                req.getOwnerNotes(),
                req.getStatus(),
                req.getCreatedAt(),
                req.getUpdatedAt(),
                messagesCount
        );
    }
}
