-- V12: Garage Quote Requests, Services Junction, and Message Audits
-- Engine: InnoDB, Charset: utf8mb4

CREATE TABLE garage_quote_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(30) NOT NULL,
    garage_id BIGINT UNSIGNED NOT NULL,
    customer_user_id BIGINT UNSIGNED NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_make VARCHAR(100) NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    vehicle_year INT UNSIGNED NULL,
    fuel_type VARCHAR(50) NULL,
    registration_number VARCHAR(30) NULL,
    odometer_reading INT UNSIGNED NULL,
    problem_description TEXT NOT NULL,
    customer_message TEXT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255) NULL,
    preferred_date DATE NULL,
    estimated_min_price DECIMAL(10, 2) NULL,
    estimated_max_price DECIMAL(10, 2) NULL,
    proposed_quote_amount DECIMAL(10, 2) NULL,
    owner_notes TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_gqr_reference UNIQUE (reference_number),
    CONSTRAINT fk_gqr_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gqr_customer FOREIGN KEY (customer_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_gqr_garage_status (garage_id, status),
    INDEX idx_gqr_customer_status (customer_user_id, status),
    INDEX idx_gqr_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quote_request_services (
    quote_request_id BIGINT UNSIGNED NOT NULL,
    service_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (quote_request_id, service_id),
    CONSTRAINT fk_qrs_request FOREIGN KEY (quote_request_id) REFERENCES garage_quote_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_qrs_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quote_request_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quote_request_id BIGINT UNSIGNED NOT NULL,
    sender_user_id BIGINT UNSIGNED NOT NULL,
    sender_role VARCHAR(30) NOT NULL,
    message_text TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qrm_request FOREIGN KEY (quote_request_id) REFERENCES garage_quote_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_qrm_sender FOREIGN KEY (sender_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_qrm_request_created (quote_request_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
