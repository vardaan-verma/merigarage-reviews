package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record AdminGarageDetailDto(
        Long id,
        String name,
        String slug,
        String description,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        BigDecimal latitude,
        BigDecimal longitude,
        String phoneNumber,
        String email,
        String websiteUrl,
        String googleMapsUrl,
        GarageApprovalStatus approvalStatus,
        Boolean isVerified,
        Long ownerId,
        String ownerName,
        String ownerEmail,
        Long createdByUserId,
        String createdByName,
        List<String> services,
        int documentsCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<GarageApprovalAuditDto> approvalHistory
) {
    public static AdminGarageDetailDto fromEntity(
            Garage g,
            List<String> services,
            int documentsCount,
            List<GarageApprovalAuditDto> approvalHistory
    ) {
        return new AdminGarageDetailDto(
                g.getId(),
                g.getName(),
                g.getSlug(),
                g.getDescription(),
                g.getAddressLine1(),
                g.getAddressLine2(),
                g.getCity(),
                g.getState(),
                g.getPostalCode(),
                g.getLatitude(),
                g.getLongitude(),
                g.getPhoneNumber(),
                g.getEmail(),
                g.getWebsiteUrl(),
                g.getGoogleMapsUrl(),
                g.getApprovalStatus(),
                g.getIsVerified(),
                g.getOwner() != null ? g.getOwner().getId() : null,
                g.getOwner() != null ? g.getOwner().getFullName() : null,
                g.getOwner() != null ? g.getOwner().getEmail() : null,
                g.getCreatedBy() != null ? g.getCreatedBy().getId() : null,
                g.getCreatedBy() != null ? g.getCreatedBy().getFullName() : null,
                services,
                documentsCount,
                g.getCreatedAt(),
                g.getUpdatedAt(),
                approvalHistory
        );
    }
}
