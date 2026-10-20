package com.merigarage.reviews.exception;

import com.merigarage.reviews.service.dto.ErrorResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    void handleDataAccessException_Returns500WithSanitizedGenericMessage() {
        DataAccessException ex = new DataAccessException("Internal SQL table column mismatch or timeout") {};

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleDataAccessException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("A database error occurred while processing your request. Please retry.");
        // Must NEVER contain the misleading legacy message
        assertThat(response.getBody().message()).doesNotContain("photo metadata");
    }

    @Test
    void handleDataIntegrityViolation_Returns409WithSanitizedMessage() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "Data truncation: Data too long for column 'registration_number' at row 1"
        );

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleDataIntegrityViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("A database constraint or data conflict occurred. Please verify your input and retry.");
        // Must not expose SQL details in client message
        assertThat(response.getBody().message()).doesNotContain("registration_number");
    }

    @Test
    void handleFileStorageException_Returns500WithSanitizedMessage() {
        FileStorageException ex = new FileStorageException("Failed to store file: disk I/O error");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleFileStorageException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("File storage operation failed. Please retry your upload.");
        assertThat(response.getBody().message()).doesNotContain("disk I/O");
    }

    @Test
    void handleLockException_Returns409WithNonWorkshopSpecificMessage() {
        CannotAcquireLockException ex = new CannotAcquireLockException("Lock wait timeout exceeded");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleLockException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).contains("The server is currently busy");
        // Must not assume it is an upload or workshop-only operation
        assertThat(response.getBody().message()).doesNotContain("retry your upload in a moment");
    }

    @Test
    void handleConstraintViolation_Returns400WithViolationDetails() {
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        Path path = mock(Path.class);
        when(path.toString()).thenReturn("registrationNumber");
        when(violation.getPropertyPath()).thenReturn(path);
        when(violation.getMessage()).thenReturn("size must be between 0 and 50");

        ConstraintViolationException ex = new ConstraintViolationException(Set.of(violation));

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleConstraintViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().details()).contains("registrationNumber: size must be between 0 and 50");
    }
}
