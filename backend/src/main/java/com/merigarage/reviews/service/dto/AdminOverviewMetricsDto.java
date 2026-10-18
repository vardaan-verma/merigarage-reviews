package com.merigarage.reviews.service.dto;

import java.util.List;
import java.util.Map;

public record AdminOverviewMetricsDto(
        long totalUsers,
        long customerAccounts,
        long garageOwnerAccounts,
        long adminAccounts,
        long newRegistrations24h,
        long newRegistrations7d,
        long newRegistrations30d,
        long totalGarages,
        long activeGarages,
        long pendingGarages,
        long suspendedGarages,
        long rejectedGarages,
        long verifiedGarages,
        long claimedGarages,
        long totalReviews,
        long totalSubmittedReviews,
        long pendingReviewReports,
        long totalLeads,
        long homepageSearchSubmissions,
        Map<String, Long> quoteRequestsByStatus,
        Map<String, Long> claimsByStatus,
        List<AdminUserSummaryDto> recentRegistrations,
        List<LeadEventSummaryDto> recentLeads,
        List<AdminQuoteSummaryDto> recentQuoteRequests,
        List<ServiceUsageDto> serviceCatalogueUsage
) {
}
