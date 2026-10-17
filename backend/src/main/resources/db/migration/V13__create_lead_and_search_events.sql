-- V13: Persistent Leads, Search Events, and Consent Tracking
-- Engine: InnoDB, Charset: utf8mb4

ALTER TABLE users
    ADD COLUMN registration_source VARCHAR(100) NULL AFTER phone_number,
    ADD COLUMN consent_status VARCHAR(50) NULL AFTER registration_source;

CREATE TABLE lead_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    event_type VARCHAR(50) NOT NULL,
    state VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    vehicle_type VARCHAR(50) NULL,
    vehicle_make VARCHAR(100) NULL,
    vehicle_model VARCHAR(100) NULL,
    service_slug VARCHAR(100) NULL,
    service_name VARCHAR(150) NULL,
    phone_number VARCHAR(20) NULL,
    garage_id BIGINT UNSIGNED NULL,
    garage_slug VARCHAR(150) NULL,
    source VARCHAR(100) NULL,
    consent_status VARCHAR(50) NULL,
    metadata_json TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_lead_event_id UNIQUE (event_id),
    CONSTRAINT fk_lead_event_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_lead_event_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE SET NULL,
    INDEX idx_lead_session (session_id),
    INDEX idx_lead_event_type (event_type),
    INDEX idx_lead_created_at (created_at),
    INDEX idx_lead_phone (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
