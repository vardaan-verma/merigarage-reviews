package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.enums.ClaimStatus;

import java.time.LocalDateTime;

public record GarageClaimDto(
        Long id,
        Long garageId,
        String garageName,
        String garageSlug,
        Long claimantUserId,
        String claimantFullName,
        String claimantEmail,
        String claimMessage,
        ClaimStatus claimStatus,
        String decisionNotes,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {
    public static GarageClaimDto fromEntity(GarageClaim claim) {
        if (claim == null) {
            return null;
        }
        return new GarageClaimDto(
                claim.getId(),
                claim.getGarage() != null ? claim.getGarage().getId() : null,
                claim.getGarage() != null ? claim.getGarage().getName() : null,
                claim.getGarage() != null ? claim.getGarage().getSlug() : null,
                claim.getClaimantUser() != null ? claim.getClaimantUser().getId() : null,
                claim.getClaimantUser() != null ? claim.getClaimantUser().getFullName() : null,
                claim.getClaimantUser() != null ? claim.getClaimantUser().getEmail() : null,
                claim.getClaimMessage(),
                claim.getClaimStatus(),
                claim.getDecisionNotes(),
                claim.getCreatedAt(),
                claim.getReviewedAt()
        );
    }
}
