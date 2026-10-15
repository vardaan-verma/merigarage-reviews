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
        if (gs == null) return null;
        Integer sId = gs.getService() != null ? gs.getService().getId() : (gs.getId() != null ? gs.getId().getServiceId() : null);
        String sName = gs.getService() != null ? gs.getService().getName() : "Service";
        ServiceCategory sCat = gs.getService() != null ? gs.getService().getCategory() : null;
        String sDesc = gs.getService() != null ? gs.getService().getDescription() : null;
        return new GarageServiceDto(
                sId,
                sName,
                sCat,
                sDesc,
                gs.getStartingPrice(),
                gs.getIsAvailable()
        );
    }
}
