package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.Service;
import com.merigarage.reviews.domain.enums.ServiceCategory;

public record ServiceDto(
        Integer id,
        String name,
        String slug,
        ServiceCategory category,
        String description,
        Boolean isActive,
        Integer displayOrder
) {
    public static ServiceDto fromEntity(Service service) {
        return new ServiceDto(
                service.getId(),
                service.getName(),
                service.getSlug(),
                service.getCategory(),
                service.getDescription(),
                service.getIsActive(),
                service.getDisplayOrder()
        );
    }
}
