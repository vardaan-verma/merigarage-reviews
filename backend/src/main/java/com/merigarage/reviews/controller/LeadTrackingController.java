package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.LeadEventType;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.LeadTrackingService;
import com.merigarage.reviews.service.dto.LeadEventSummaryDto;
import com.merigarage.reviews.service.dto.PagedResponse;
import com.merigarage.reviews.service.dto.TrackLeadEventRequest;
import com.merigarage.reviews.service.dto.TrackLeadEventResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class LeadTrackingController {

    private final LeadTrackingService leadTrackingService;
    private final SecurityContextService securityContextService;

    public LeadTrackingController(LeadTrackingService leadTrackingService,
                                  SecurityContextService securityContextService) {
        this.leadTrackingService = leadTrackingService;
        this.securityContextService = securityContextService;
    }

    @PostMapping("/leads/track")
    public ResponseEntity<TrackLeadEventResponse> trackEvent(@Valid @RequestBody TrackLeadEventRequest request) {
        User currentUser = securityContextService.getCurrentUser().orElse(null);
        TrackLeadEventResponse response = leadTrackingService.trackEvent(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/admin/leads")
    @PreAuthorize("hasAuthority('LEAD_ACCESS')")
    public ResponseEntity<PagedResponse<LeadEventSummaryDto>> getAdminLeads(
            @RequestParam(required = false) LeadEventType eventType,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String serviceSlug,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) Boolean hasUser,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime fromDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.LEAD_ACCESS);
        int validatedPage = Math.max(0, page);
        int validatedSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LeadEventSummaryDto> leadPage = leadTrackingService.searchLeadEvents(
                eventType, city, state, serviceSlug, source, hasUser, search, fromDate, toDate, pageable
        );
        return ResponseEntity.ok(PagedResponse.fromPage(leadPage));
    }
}
