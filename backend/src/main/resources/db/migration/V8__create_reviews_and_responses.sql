-- V8: Reviews with Derived Overall Rating and Owner Responses
-- Engine: InnoDB, Charset: utf8mb4

CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    garage_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    rating_service_quality TINYINT UNSIGNED NOT NULL,
    rating_pricing TINYINT UNSIGNED NOT NULL,
    rating_timeline TINYINT UNSIGNED NOT NULL,
    rating_communication TINYINT UNSIGNED NOT NULL,
    overall_rating DECIMAL(3, 2) GENERATED ALWAYS AS (ROUND((rating_service_quality + rating_pricing + rating_timeline + rating_communication) / 4.0, 2)) STORED,
    review_title VARCHAR(150) NULL,
    review_text TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_by_admin_id BIGINT UNSIGNED NULL,
    deleted_at DATETIME NULL,
    deletion_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_reviews_user_garage UNIQUE (garage_id, user_id),
    CONSTRAINT chk_reviews_rating_sq CHECK (rating_service_quality BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_rating_pr CHECK (rating_pricing BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_rating_tl CHECK (rating_timeline BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_rating_cm CHECK (rating_communication BETWEEN 1 AND 5),
    CONSTRAINT fk_rev_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE RESTRICT,
    CONSTRAINT fk_rev_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_rev_admin FOREIGN KEY (deleted_by_admin_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_rev_garage_display (garage_id, status, is_deleted, created_at),
    INDEX idx_rev_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE review_responses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    review_id BIGINT UNSIGNED NOT NULL,
    owner_user_id BIGINT UNSIGNED NOT NULL,
    response_text TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_review_responses_review_id UNIQUE (review_id),
    CONSTRAINT fk_rr_review FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE RESTRICT,
    CONSTRAINT fk_rr_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
