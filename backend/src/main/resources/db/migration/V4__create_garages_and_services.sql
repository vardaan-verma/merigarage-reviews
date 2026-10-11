-- V4: Garages Listing and Garage Services Junction
-- Engine: InnoDB, Charset: utf8mb4

CREATE TABLE garages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    owner_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NULL,
    website_url VARCHAR(255) NULL,
    approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_garages_slug UNIQUE (slug),
    CONSTRAINT fk_garages_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_garages_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_garages_discovery (approval_status, city, is_verified),
    INDEX idx_garages_owner (owner_id),
    INDEX idx_garages_geo (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE garage_services (
    garage_id BIGINT UNSIGNED NOT NULL,
    service_id INT UNSIGNED NOT NULL,
    starting_price DECIMAL(10, 2) NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (garage_id, service_id),
    CONSTRAINT fk_gs_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE CASCADE,
    CONSTRAINT fk_gs_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
