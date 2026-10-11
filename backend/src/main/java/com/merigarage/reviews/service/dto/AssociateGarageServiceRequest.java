package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AssociateGarageServiceRequest(
        @NotNull Integer serviceId,
        BigDecimal startingPrice,
        Boolean isAvailable
) {}
