package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.GarageService;
import com.merigarage.reviews.domain.enums.ServiceCategory;

import java.math.BigDecimal;

public record GarageServiceDto(
        Integer serviceId,
        String serviceName,
        ServiceCategory category,
        String description,
        BigDecimal startingPrice,
        Boolean isAvailable
) {
    public static GarageServiceDto fromEntity(GarageService gs) {
        return new GarageServiceDto(
                gs.getService().getId(),
                gs.getService().getName(),
                gs.getService().getCategory(),
                gs.getService().getDescription(),
                gs.getStartingPrice(),
                gs.getIsAvailable()
        );
    }
}
