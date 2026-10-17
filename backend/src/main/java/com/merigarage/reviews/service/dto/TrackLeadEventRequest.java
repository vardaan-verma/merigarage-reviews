package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.LeadEventType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record TrackLeadEventRequest(
        @Size(max = 64) String eventId,
        @Size(max = 64) String sessionId,
        @NotNull LeadEventType eventType,
        @Size(max = 100) String state,
        @Size(max = 100) String city,
        @Size(max = 50) String vehicleType,
        @Size(max = 100) String vehicleMake,
        @Size(max = 100) String vehicleModel,
        @Size(max = 100) String serviceSlug,
        @Size(max = 150) String serviceName,
        @Size(max = 20) String phoneNumber,
        Long garageId,
        @Size(max = 150) String garageSlug,
        @Size(max = 100) String source,
        @Size(max = 50) String consentStatus,
        Map<String, Object> metadata
) {}
