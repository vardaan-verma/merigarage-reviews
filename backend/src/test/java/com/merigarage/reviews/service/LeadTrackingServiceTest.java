package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.LeadEvent;
import com.merigarage.reviews.domain.enums.LeadEventType;
import com.merigarage.reviews.repository.LeadEventRepository;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.service.dto.LeadEventSummaryDto;
import com.merigarage.reviews.service.dto.TrackLeadEventRequest;
import com.merigarage.reviews.service.dto.TrackLeadEventResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LeadTrackingServiceTest {

    @Autowired
    private LeadTrackingService leadTrackingService;

    @Autowired
    private LeadEventRepository leadEventRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void trackEvent_PersistsSearchLeadWithoutCreatingUserAccount() {
        long initialUserCount = userRepository.count();
        String sessionId = "ses_" + UUID.randomUUID().toString().substring(0, 8);

        TrackLeadEventRequest request = new TrackLeadEventRequest(
                null,
                sessionId,
                LeadEventType.HOMEPAGE_SEARCH_SUBMITTED,
                "Delhi NCR",
                "Gurugram",
                "CAR",
                "Tata",
                "Harrier",
                "ac-repair-and-gas-refill",
                "AC Service & Gas Recharge",
                "+91 9876543210",
                null,
                null,
                "landing_page",
                "CONSENT_GRANTED",
                Map.of("testKey", "testVal")
        );

        TrackLeadEventResponse response = leadTrackingService.trackEvent(request);

        assertThat(response).isNotNull();
        assertThat(response.eventId()).isNotBlank();
        assertThat(response.sessionId()).isEqualTo(sessionId);
        assertThat(response.eventType()).isEqualTo("HOMEPAGE_SEARCH_SUBMITTED");
        assertThat(response.status()).isEqualTo("RECORDED");

        // Verify event was saved to repository
        LeadEvent saved = leadEventRepository.findByEventId(response.eventId()).orElseThrow();
        assertThat(saved.getCity()).isEqualTo("Gurugram");
        assertThat(saved.getState()).isEqualTo("Delhi NCR");
        assertThat(saved.getVehicleMake()).isEqualTo("Tata");
        assertThat(saved.getVehicleModel()).isEqualTo("Harrier");
        assertThat(saved.getServiceSlug()).isEqualTo("ac-repair-and-gas-refill");
        assertThat(saved.getPhoneNumber()).isEqualTo("+919876543210");
        assertThat(saved.getSource()).isEqualTo("landing_page");

        // Strictest rule: Anonymous search MUST NEVER create a user account
        long postUserCount = userRepository.count();
        assertThat(postUserCount).isEqualTo(initialUserCount);
    }

    @Test
    void trackEvent_DeduplicatesRapidRepeatedSubmissions() {
        String sessionId = "ses_dedup_" + UUID.randomUUID().toString().substring(0, 8);

        TrackLeadEventRequest request1 = new TrackLeadEventRequest(
                null,
                sessionId,
                LeadEventType.HOMEPAGE_SEARCH_SUBMITTED,
                "Maharashtra",
                "Mumbai",
                "CAR",
                "Mahindra",
                "XUV700",
                "oil-and-filter-change",
                "Oil Change",
                "9811223344",
                null,
                null,
                "landing_page",
                null,
                null
        );

        TrackLeadEventResponse response1 = leadTrackingService.trackEvent(request1);
        assertThat(response1.status()).isEqualTo("RECORDED");

        // Rapid duplicate submission with identical criteria within seconds
        TrackLeadEventResponse response2 = leadTrackingService.trackEvent(request1);
        assertThat(response2.status()).isEqualTo("RECORDED");
        assertThat(response2.eventId()).isEqualTo(response1.eventId());
    }

    @Test
    void getRecentLeads_MasksPhoneNumbersInAdminView() {
        String sessionId = "ses_mask_" + UUID.randomUUID().toString().substring(0, 8);

        TrackLeadEventRequest request = new TrackLeadEventRequest(
                null,
                sessionId,
                LeadEventType.HOMEPAGE_SEARCH_SUBMITTED,
                "Karnataka",
                "Bengaluru",
                "CAR",
                "Hyundai",
                "Creta",
                null,
                null,
                "9876543210",
                null,
                null,
                "landing_page",
                null,
                null
        );

        leadTrackingService.trackEvent(request);

        Page<LeadEventSummaryDto> leads = leadTrackingService.getLeadEventsForAdmin(null, PageRequest.of(0, 10));
        assertThat(leads.getContent()).isNotEmpty();

        LeadEventSummaryDto found = leads.getContent().stream()
                .filter(l -> sessionId.equals(l.sessionId()))
                .findFirst()
                .orElseThrow();

        // Phone number MUST be masked for privacy in administrative review (never exposes raw numbers)
        assertThat(found.maskedPhoneNumber()).isEqualTo("+91****3210");
    }
}
