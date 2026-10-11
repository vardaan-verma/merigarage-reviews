package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GaragePhoto;

public record GaragePhotoDto(
        Long id,
        String caption,
        Byte displayOrder,
        Boolean isCover
) {
    public static GaragePhotoDto fromEntity(GaragePhoto photo) {
        return new GaragePhotoDto(
                photo.getId(),
                photo.getCaption(),
                photo.getDisplayOrder(),
                photo.getIsCover()
        );
    }
}
