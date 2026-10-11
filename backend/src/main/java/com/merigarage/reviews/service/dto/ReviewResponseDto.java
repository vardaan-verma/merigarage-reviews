package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.ReviewResponse;

import java.time.LocalDateTime;

public record ReviewResponseDto(
        Long id,
        String responseText,
        LocalDateTime createdAt
) {
    public static ReviewResponseDto fromEntity(ReviewResponse response) {
        if (response == null) {
            return null;
        }
        return new ReviewResponseDto(
                response.getId(),
                response.getResponseText(),
                response.getCreatedAt()
        );
    }
}
