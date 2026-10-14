package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Garage;
import java.math.BigDecimal;

public record GarageSummaryDto(
        Long id,
        String name,
        String slug,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String phoneNumber,
        Boolean isVerified,
        Long coverPhotoId,
        BigDecimal latitude,
        BigDecimal longitude,
        String googleMapsUrl
) {
    public static GarageSummaryDto fromEntity(Garage garage, Long coverPhotoId) {
        return new GarageSummaryDto(
                garage.getId(),
                garage.getName(),
                garage.getSlug(),
                garage.getAddressLine1(),
                garage.getAddressLine2(),
                garage.getCity(),
                garage.getState(),
                garage.getPostalCode(),
                garage.getPhoneNumber(),
                garage.getIsVerified(),
                coverPhotoId,
                garage.getLatitude(),
                garage.getLongitude(),
                garage.getGoogleMapsUrl()
        );
    }
}
