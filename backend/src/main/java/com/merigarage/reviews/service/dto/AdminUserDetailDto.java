package com.merigarage.reviews.service.dto;

import java.util.List;

public record AdminUserDetailDto(
        AdminUserSummaryDto user,
        List<GarageSummaryDto> linkedGarages,
        List<QuoteRequestDto> quoteRequests,
        List<GarageClaimDto> ownershipClaims
) {
}
