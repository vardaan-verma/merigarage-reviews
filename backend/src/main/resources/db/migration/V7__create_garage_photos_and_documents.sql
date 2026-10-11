-- V7: Garage Gallery Photos and Private Verification Documents
-- Engine: InnoDB, Charset: utf8mb4

CREATE TABLE garage_photos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    garage_id BIGINT UNSIGNED NOT NULL,
    uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT UNSIGNED NOT NULL,
    caption VARCHAR(200) NULL,
    display_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT uk_gp_single_cover UNIQUE (garage_id, (CASE WHEN is_cover = TRUE AND is_deleted = FALSE THEN 1 ELSE NULL END)),
    CONSTRAINT fk_gp_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gp_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_gp_active_list (garage_id, is_deleted, moderation_status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE garage_documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    garage_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT UNSIGNED NOT NULL,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reviewed_by_admin_id BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    rejection_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gd_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gd_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_gd_garage_status (garage_id, verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
