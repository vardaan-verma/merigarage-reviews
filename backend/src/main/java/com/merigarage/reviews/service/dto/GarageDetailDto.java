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
        BigDecimal latitude,
        BigDecimal longitude,
        Boolean isVerified,
        Long coverPhotoId,
        List<GaragePhotoDto> photos,
        List<GarageServiceDto> services
) {
    public static GarageDetailDto fromEntity(Garage garage, Long coverPhotoId, List<GaragePhotoDto> photos, List<GarageServiceDto> services) {
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
                garage.getLatitude(),
                garage.getLongitude(),
                garage.getIsVerified(),
                coverPhotoId,
                photos,
                services
        );
    }
}
