package com.merigarage.reviews.service.dto;

import java.time.LocalDateTime;

public record TrackLeadEventResponse(
        String eventId,
        String sessionId,
        String eventType,
        String status,
        LocalDateTime timestamp
) {}
