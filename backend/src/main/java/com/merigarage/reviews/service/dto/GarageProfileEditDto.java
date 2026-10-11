package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageProfileEdit;
import com.merigarage.reviews.domain.enums.EditStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record GarageProfileEditDto(
        Long id,
        Long garageId,
        Long submittedByUserId,
        String proposedName,
        String proposedDescription,
        String proposedAddressLine1,
        String proposedAddressLine2,
        String proposedCity,
        String proposedState,
        String proposedPostalCode,
        String proposedPhoneNumber,
        String proposedEmail,
        String proposedWebsiteUrl,
        BigDecimal proposedLatitude,
        BigDecimal proposedLongitude,
        EditStatus status,
        String rejectionReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {
    public static GarageProfileEditDto fromEntity(GarageProfileEdit edit) {
        return new GarageProfileEditDto(
                edit.getId(),
                edit.getGarage().getId(),
                edit.getSubmittedBy().getId(),
                edit.getProposedName(),
                edit.getProposedDescription(),
                edit.getProposedAddressLine1(),
                edit.getProposedAddressLine2(),
                edit.getProposedCity(),
                edit.getProposedState(),
                edit.getProposedPostalCode(),
                edit.getProposedPhoneNumber(),
                edit.getProposedEmail(),
                edit.getProposedWebsiteUrl(),
                edit.getProposedLatitude(),
                edit.getProposedLongitude(),
                edit.getStatus(),
                edit.getRejectionReason(),
                edit.getCreatedAt(),
                edit.getReviewedAt()
        );
    }
}
