package com.merigarage.reviews.service.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ErrorResponse(
        int status,
        String error,
        String message,
        List<String> details,
        LocalDateTime timestamp
) {
    public ErrorResponse(int status, String error, String message) {
        this(status, error, message, List.of(), LocalDateTime.now());
    }

    public ErrorResponse(int status, String error, String message, List<String> details) {
        this(status, error, message, details != null ? details : List.of(), LocalDateTime.now());
    }
}
