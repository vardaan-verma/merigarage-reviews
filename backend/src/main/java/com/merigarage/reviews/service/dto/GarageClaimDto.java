package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.enums.ClaimStatus;

import java.time.LocalDateTime;

public record GarageClaimDto(
        Long id,
        Long garageId,
        String garageName,
        Long claimantUserId,
        String claimantFullName,
        String claimMessage,
        ClaimStatus claimStatus,
        String decisionNotes,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {
    public static GarageClaimDto fromEntity(GarageClaim claim) {
        return new GarageClaimDto(
                claim.getId(),
                claim.getGarage().getId(),
                claim.getGarage().getName(),
                claim.getClaimantUser().getId(),
                claim.getClaimantUser().getFullName(),
                claim.getClaimMessage(),
                claim.getClaimStatus(),
                claim.getDecisionNotes(),
                claim.getCreatedAt(),
                claim.getReviewedAt()
        );
    }
}
