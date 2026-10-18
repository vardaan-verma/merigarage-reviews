-- V17: Support saved vehicles for vehicle owners and user profile photo
-- Engine: InnoDB, Charset: utf8mb4

ALTER TABLE users
    ADD COLUMN profile_photo_url VARCHAR(500) NULL AFTER phone_number;

CREATE TABLE user_vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'Car',
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT UNSIGNED NULL,
    registration_number VARCHAR(50) NULL,
    fuel_type VARCHAR(50) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_uv_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_user_vehicles_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
