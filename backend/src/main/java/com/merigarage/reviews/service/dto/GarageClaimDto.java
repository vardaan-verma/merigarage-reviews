package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.enums.ClaimStatus;

import java.time.LocalDateTime;

public record GarageClaimDto(
        Long id,
        Long garageId,
        String garageName,
        String garageSlug,
        String garageCity,
        String garageAddress,
        Long claimantUserId,
        String claimantFullName,
        String claimantName,
        String claimantEmail,
        String claimantPhone,
        String businessRegNumber,
        String claimMessage,
        ClaimStatus claimStatus,
        String decisionNotes,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        java.util.List<GarageDocumentDto> documents
) {
    public static GarageClaimDto fromEntity(GarageClaim claim) {
        return fromEntity(claim, claim != null && claim.getDocuments() != null
                ? claim.getDocuments().stream().map(GarageDocumentDto::fromEntity).toList()
                : java.util.List.of());
    }

    public static GarageClaimDto fromEntity(GarageClaim claim, java.util.List<GarageDocumentDto> documents) {
        if (claim == null) {
            return null;
        }
        String email = claim.getClaimantEmail() != null
                ? claim.getClaimantEmail()
                : (claim.getClaimantUser() != null ? claim.getClaimantUser().getEmail() : null);
        String name = claim.getClaimantName() != null
                ? claim.getClaimantName()
                : (claim.getClaimantUser() != null ? claim.getClaimantUser().getFullName() : null);
        String phone = claim.getClaimantPhone() != null
                ? claim.getClaimantPhone()
                : (claim.getClaimantUser() != null ? claim.getClaimantUser().getPhoneNumber() : null);

        return new GarageClaimDto(
                claim.getId(),
                claim.getGarage() != null ? claim.getGarage().getId() : null,
                claim.getGarage() != null ? claim.getGarage().getName() : null,
                claim.getGarage() != null ? claim.getGarage().getSlug() : null,
                claim.getGarage() != null ? claim.getGarage().getCity() : null,
                claim.getGarage() != null ? claim.getGarage().getAddressLine1() : null,
                claim.getClaimantUser() != null ? claim.getClaimantUser().getId() : null,
                claim.getClaimantUser() != null ? claim.getClaimantUser().getFullName() : null,
                name,
                email,
                phone,
                claim.getBusinessRegNumber(),
                claim.getClaimMessage(),
                claim.getClaimStatus(),
                claim.getDecisionNotes(),
                claim.getCreatedAt(),
                claim.getReviewedAt(),
                documents != null ? documents : java.util.List.of()
        );
    }
}
