package com.merigarage.reviews.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.http.MediaType;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminPortalControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void getOverview_Anonymous_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getOverview_RegularUser_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getOverview_AdminUser_ReturnsMetrics() throws Exception {
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").isNumber())
                .andExpect(jsonPath("$.totalGarages").isNumber())
                .andExpect(jsonPath("$.claimedGarages").isNumber())
                .andExpect(jsonPath("$.totalReviews").isNumber())
                .andExpect(jsonPath("$.quoteRequestsByStatus").isMap())
                .andExpect(jsonPath("$.claimsByStatus").isMap());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void searchUsers_AdminWithoutPermission_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "USER_MANAGEMENT"})
    void searchUsers_AdminWithUserManagement_ReturnsUsersPage() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void searchGarages_AdminWithoutPermission_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/garages/all"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "GARAGE_APPROVAL"})
    void searchGarages_AdminWithGarageApproval_ReturnsGaragesPage() throws Exception {
        mockMvc.perform(get("/api/admin/garages/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void searchQuotes_AdminWithoutPermission_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/quotes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "QUOTE_OVERSIGHT"})
    void searchQuotes_AdminWithQuoteOversight_ReturnsQuotesPage() throws Exception {
        mockMvc.perform(get("/api/admin/quotes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void exportCsv_AdminWithoutPermission_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/export/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "DATA_EXPORT"})
    void exportCsv_AdminWithDataExport_ReturnsCsv() throws Exception {
        mockMvc.perform(get("/api/admin/export/users"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"merigarage_users_export.csv\""));
    }

    @Test
    @WithMockUser(roles = "USER")
    void getAuditLogs_RegularUser_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAuditLogs_AdminUser_ReturnsAuditLogsPage() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @WithMockUser(roles = "USER")
    void switchUserPrimaryRole_RegularUser_Forbidden() throws Exception {
        mockMvc.perform(post("/api/admin/users/1/primary-role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetRole\":\"ROLE_GARAGE_OWNER\",\"reason\":\"Unauthorized test attempt\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void switchUserPrimaryRole_AdminWithoutPermission_Forbidden() throws Exception {
        mockMvc.perform(post("/api/admin/users/1/primary-role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetRole\":\"ROLE_GARAGE_OWNER\",\"reason\":\"Missing permission attempt\"}"))
                .andExpect(status().isForbidden());
    }
}
