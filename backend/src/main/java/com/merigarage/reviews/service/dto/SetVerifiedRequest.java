package com.merigarage.reviews.service.dto;

public record SetVerifiedRequest(
        boolean verified,
        String notes
) {}
