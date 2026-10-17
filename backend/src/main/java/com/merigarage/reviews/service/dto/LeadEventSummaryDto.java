package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.LeadEvent;
import java.time.LocalDateTime;

public record LeadEventSummaryDto(
        Long id,
        String eventId,
        String sessionId,
        Long userId,
        String userEmail,
        String eventType,
        String state,
        String city,
        String vehicleType,
        String vehicleMake,
        String vehicleModel,
        String serviceSlug,
        String serviceName,
        String maskedPhoneNumber,
        String phoneNumber,
        Long garageId,
        String garageSlug,
        String source,
        String consentStatus,
        LocalDateTime createdAt
) {
    public static LeadEventSummaryDto fromEntity(LeadEvent event) {
        String maskedPhone = maskPhone(event.getPhoneNumber());
        return new LeadEventSummaryDto(
                event.getId(),
                event.getEventId(),
                event.getSessionId(),
                event.getUser() != null ? event.getUser().getId() : null,
                event.getUser() != null ? event.getUser().getEmail() : null,
                event.getEventType().name(),
                event.getState(),
                event.getCity(),
                event.getVehicleType(),
                event.getVehicleMake(),
                event.getVehicleModel(),
                event.getServiceSlug(),
                event.getServiceName(),
                maskedPhone,
                event.getPhoneNumber(),
                event.getGarage() != null ? event.getGarage().getId() : null,
                event.getGarageSlug(),
                event.getSource(),
                event.getConsentStatus(),
                event.getCreatedAt()
        );
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        String clean = phone.trim();
        if (clean.length() <= 4) return "****";
        return clean.substring(0, Math.min(3, clean.length() - 4)) + "****" + clean.substring(clean.length() - 4);
    }
}
