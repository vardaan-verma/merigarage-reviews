package com.merigarage.reviews.service;

import tools.jackson.databind.ObjectMapper;
import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.LeadEvent;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.LeadEventType;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.LeadEventRepository;
import com.merigarage.reviews.service.dto.LeadEventSummaryDto;
import com.merigarage.reviews.service.dto.TrackLeadEventRequest;
import com.merigarage.reviews.service.dto.TrackLeadEventResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class LeadTrackingService {

    private static final Logger log = LoggerFactory.getLogger(LeadTrackingService.class);

    private final LeadEventRepository leadEventRepository;
    private final GarageRepository garageRepository;
    private final ObjectMapper objectMapper;

    public LeadTrackingService(LeadEventRepository leadEventRepository,
                               GarageRepository garageRepository,
                               ObjectMapper objectMapper) {
        this.leadEventRepository = leadEventRepository;
        this.garageRepository = garageRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TrackLeadEventResponse trackEvent(TrackLeadEventRequest request) {
        return trackEvent(request, null);
    }

    @Transactional
    public TrackLeadEventResponse trackEvent(TrackLeadEventRequest request, User currentUser) {
        if (request == null || request.eventType() == null) {
            throw new IllegalArgumentException("Lead event type is required.");
        }

        String eventId = (request.eventId() != null && !request.eventId().isBlank())
                ? request.eventId().trim()
                : UUID.randomUUID().toString();

        String sessionId = (request.sessionId() != null && !request.sessionId().isBlank())
                ? request.sessionId().trim()
                : UUID.randomUUID().toString();

        // Idempotency check: if eventId is already processed, return idempotent response
        Optional<LeadEvent> existingOpt = leadEventRepository.findByEventId(eventId);
        if (existingOpt.isPresent()) {
            LeadEvent existing = existingOpt.get();
            return new TrackLeadEventResponse(
                    existing.getEventId(),
                    existing.getSessionId(),
                    existing.getEventType().name(),
                    "RECORDED",
                    existing.getCreatedAt()
            );
        }

        // Debounce check: prevent duplicate rapid clicks within 5 seconds for the same session and event type
        Optional<LeadEvent> recentOpt = leadEventRepository.findFirstBySessionIdAndEventTypeOrderByCreatedAtDesc(sessionId, request.eventType());
        if (recentOpt.isPresent()) {
            LeadEvent recent = recentOpt.get();
            if (recent.getCreatedAt() != null && recent.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(5))) {
                if (Objects.equals(recent.getCity(), request.city()) &&
                    Objects.equals(recent.getServiceSlug(), request.serviceSlug()) &&
                    Objects.equals(recent.getVehicleModel(), request.vehicleModel())) {
                    log.debug("Debounced duplicate lead event for session {}", sessionId);
                    return new TrackLeadEventResponse(
                            recent.getEventId(),
                            recent.getSessionId(),
                            recent.getEventType().name(),
                            "RECORDED",
                            recent.getCreatedAt()
                    );
                }
            }
        }

        LeadEvent event = new LeadEvent();
        event.setEventId(eventId);
        event.setSessionId(sessionId);
        event.setEventType(request.eventType());
        event.setUser(currentUser); // null for anonymous visitors
        event.setState(request.state() != null ? request.state().trim() : null);
        event.setCity(request.city() != null ? request.city().trim() : null);
        event.setVehicleType(request.vehicleType() != null ? request.vehicleType().trim() : null);
        event.setVehicleMake(request.vehicleMake() != null ? request.vehicleMake().trim() : null);
        event.setVehicleModel(request.vehicleModel() != null ? request.vehicleModel().trim() : null);
        event.setServiceSlug(request.serviceSlug() != null ? request.serviceSlug().trim() : null);
        event.setServiceName(request.serviceName() != null ? request.serviceName().trim() : null);
        event.setPhoneNumber(UserService.normalizePhoneNumber(request.phoneNumber()));

        if (request.garageId() != null) {
            Garage garage = garageRepository.findById(request.garageId()).orElse(null);
            event.setGarage(garage);
        }
        event.setGarageSlug(request.garageSlug() != null ? request.garageSlug().trim() : null);
        event.setSource(request.source() != null ? request.source().trim() : "web_client");
        event.setConsentStatus(request.consentStatus() != null ? request.consentStatus().trim() : "ESSENTIAL_ONLY");

        if (request.metadata() != null && !request.metadata().isEmpty()) {
            try {
                event.setMetadataJson(objectMapper.writeValueAsString(request.metadata()));
            } catch (Exception ex) {
                log.warn("Failed to serialize lead metadata: {}", ex.getMessage());
            }
        }

        LeadEvent saved = leadEventRepository.save(event);
        log.info("Recorded lead event: type={}, eventId={}, session={}", saved.getEventType(), saved.getEventId(), saved.getSessionId());

        return new TrackLeadEventResponse(
                saved.getEventId(),
                saved.getSessionId(),
                saved.getEventType().name(),
                "RECORDED",
                saved.getCreatedAt()
        );
    }

    public Page<LeadEventSummaryDto> getLeadEventsForAdmin(LeadEventType eventType, Pageable pageable) {
        Page<LeadEvent> page;
        if (eventType != null) {
            page = leadEventRepository.findByEventTypeOrderByCreatedAtDesc(eventType, pageable);
        } else {
            page = leadEventRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return page.map(LeadEventSummaryDto::fromEntity);
    }

    public Page<LeadEventSummaryDto> searchLeadEvents(
            LeadEventType eventType,
            String city,
            String state,
            String serviceSlug,
            String source,
            Boolean hasUser,
            String search,
            java.time.LocalDateTime fromDt,
            java.time.LocalDateTime toDt,
            Pageable pageable
    ) {
        String cleanCity = (city != null && !city.isBlank()) ? city.trim() : null;
        String cleanState = (state != null && !state.isBlank()) ? state.trim() : null;
        String cleanSlug = (serviceSlug != null && !serviceSlug.isBlank()) ? serviceSlug.trim() : null;
        String cleanSource = (source != null && !source.isBlank()) ? source.trim() : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<LeadEvent> page = leadEventRepository.searchLeadEvents(
                eventType, cleanCity, cleanState, cleanSlug, cleanSource, hasUser, cleanSearch, fromDt, toDt, pageable
        );
        return page.map(LeadEventSummaryDto::fromEntity);
    }
}
