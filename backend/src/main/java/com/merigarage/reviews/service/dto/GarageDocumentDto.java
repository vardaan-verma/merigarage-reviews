package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.domain.enums.DocumentVerificationStatus;

import java.time.LocalDateTime;

public record GarageDocumentDto(
        Long id,
        Long garageId,
        DocumentType documentType,
        String originalFileName,
        String contentType,
        Long fileSizeBytes,
        DocumentVerificationStatus verificationStatus,
        String rejectionReason,
        LocalDateTime createdAt
) {
    public static GarageDocumentDto fromEntity(GarageDocument doc) {
        return new GarageDocumentDto(
                doc.getId(),
                doc.getGarage().getId(),
                doc.getDocumentType(),
                doc.getOriginalFileName(),
                doc.getContentType(),
                doc.getFileSizeBytes(),
                doc.getVerificationStatus(),
                doc.getRejectionReason(),
                doc.getCreatedAt()
        );
    }
}
