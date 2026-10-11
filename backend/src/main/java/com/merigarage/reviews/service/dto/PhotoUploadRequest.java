package com.merigarage.reviews.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PhotoUploadRequest(
        @NotBlank @Size(max = 500) String storageKey,
        @NotBlank @Size(max = 100) String contentType,
        @NotNull Long fileSizeBytes,
        @Size(max = 200) String caption,
        Byte displayOrder,
        Boolean isCover
) {}
