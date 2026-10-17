package com.merigarage.reviews.service.dto;

public record ServiceUsageDto(
        Integer serviceId,
        String serviceName,
        String slug,
        String category,
        long offeringGaragesCount
) {
}
