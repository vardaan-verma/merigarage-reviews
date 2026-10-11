-- V5: Staged Garage Profile Edits and Approval Audit Log
-- Engine: InnoDB, Charset: utf8mb4

CREATE TABLE garage_profile_edits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    garage_id BIGINT UNSIGNED NOT NULL,
    submitted_by_user_id BIGINT UNSIGNED NOT NULL,
    proposed_name VARCHAR(150) NOT NULL,
    proposed_description TEXT NULL,
    proposed_address_line1 VARCHAR(255) NOT NULL,
    proposed_address_line2 VARCHAR(255) NULL,
    proposed_city VARCHAR(100) NOT NULL,
    proposed_state VARCHAR(100) NOT NULL,
    proposed_postal_code VARCHAR(20) NOT NULL,
    proposed_phone_number VARCHAR(20) NOT NULL,
    proposed_email VARCHAR(255) NULL,
    proposed_website_url VARCHAR(255) NULL,
    proposed_latitude DECIMAL(10, 7) NULL,
    proposed_longitude DECIMAL(10, 7) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reviewed_by_admin_id BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    rejection_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_gpe_single_pending UNIQUE (garage_id, (CASE WHEN status = 'PENDING' THEN 1 ELSE NULL END)),
    CONSTRAINT fk_gpe_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gpe_submitter FOREIGN KEY (submitted_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gpe_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_gpe_garage_status (garage_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE garage_approval_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    garage_id BIGINT UNSIGNED NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    reference_edit_id BIGINT UNSIGNED NULL,
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    previous_verified BOOLEAN NOT NULL,
    new_verified BOOLEAN NOT NULL,
    decision_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gaa_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gaa_admin FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gaa_edit FOREIGN KEY (reference_edit_id) REFERENCES garage_profile_edits (id) ON DELETE SET NULL,
    INDEX idx_gaa_garage_date (garage_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
