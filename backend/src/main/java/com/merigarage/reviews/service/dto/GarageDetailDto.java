package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Garage;

import java.math.BigDecimal;
import java.util.List;

public record GarageDetailDto(
        Long id,
        String name,
        String slug,
        String description,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String phoneNumber,
        String email,
        String websiteUrl,
        String googleMapsUrl,
        BigDecimal latitude,
        BigDecimal longitude,
        Boolean isVerified,
        Long coverPhotoId,
        List<GaragePhotoDto> photos,
        List<GarageServiceDto> services,
        Boolean hasOwner,
        Long ownerId
) {
    public static GarageDetailDto fromEntity(Garage garage, Long coverPhotoId, List<GaragePhotoDto> photos, List<GarageServiceDto> services) {
        boolean hasOwner = garage.getOwner() != null;
        Long ownerId = hasOwner ? garage.getOwner().getId() : null;
        return new GarageDetailDto(
                garage.getId(),
                garage.getName(),
                garage.getSlug(),
                garage.getDescription(),
                garage.getAddressLine1(),
                garage.getAddressLine2(),
                garage.getCity(),
                garage.getState(),
                garage.getPostalCode(),
                garage.getPhoneNumber(),
                garage.getEmail(),
                garage.getWebsiteUrl(),
                garage.getGoogleMapsUrl(),
                garage.getLatitude(),
                garage.getLongitude(),
                garage.getIsVerified(),
                coverPhotoId,
                photos,
                services,
                hasOwner,
                ownerId
        );
    }
}
