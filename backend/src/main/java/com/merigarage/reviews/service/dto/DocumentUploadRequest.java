package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.enums.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DocumentUploadRequest(
        @NotNull DocumentType documentType,
        @NotBlank @Size(max = 500) String storageKey,
        @NotBlank @Size(max = 255) String originalFileName,
        @NotBlank @Size(max = 100) String contentType,
        @NotNull Long fileSizeBytes
) {}
