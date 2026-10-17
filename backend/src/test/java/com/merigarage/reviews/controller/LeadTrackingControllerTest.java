package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.enums.LeadEventType;
import com.merigarage.reviews.service.dto.TrackLeadEventRequest;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LeadTrackingControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void trackEvent_AnonymousVisitor_Success_DoesNotRequireAuth() throws Exception {
        String sessionId = "ses_" + UUID.randomUUID().toString().substring(0, 8);

        TrackLeadEventRequest request = new TrackLeadEventRequest(
                null,
                sessionId,
                LeadEventType.HOMEPAGE_SEARCH_SUBMITTED,
                "Delhi NCR",
                "Faridabad",
                "CAR",
                "Tata",
                "Harrier",
                "ac-repair-and-gas-refill",
                "AC Service & Gas Recharge",
                "9876543210",
                null,
                null,
                "landing_page",
                null,
                null
        );

        mockMvc.perform(post("/api/leads/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").value(sessionId))
                .andExpect(jsonPath("$.eventType").value("HOMEPAGE_SEARCH_SUBMITTED"))
                .andExpect(jsonPath("$.status").value("RECORDED"))
                .andExpect(jsonPath("$.eventId").isNotEmpty());
    }

    @Test
    void getAdminLeads_Anonymous_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/leads"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getAdminLeads_RegularUser_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/leads"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAdminLeads_AdminWithoutPermission_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/leads"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "LEAD_ACCESS"})
    void getAdminLeads_AdminWithLeadAccess_ReturnsLeadsPage() throws Exception {
        mockMvc.perform(get("/api/admin/leads"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
