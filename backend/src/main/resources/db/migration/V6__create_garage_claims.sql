-- V6: Garage Ownership Claims
-- Engine: InnoDB, Charset: utf8mb4

CREATE TABLE garage_claims (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    garage_id BIGINT UNSIGNED NOT NULL,
    claimant_user_id BIGINT UNSIGNED NOT NULL,
    claim_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    claim_message TEXT NOT NULL,
    reviewed_by_admin_id BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    decision_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_gc_single_pending UNIQUE (garage_id, claimant_user_id, (CASE WHEN claim_status = 'PENDING' THEN 1 ELSE NULL END)),
    CONSTRAINT fk_gc_garage FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gc_claimant FOREIGN KEY (claimant_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_gc_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_gc_garage_claimant (garage_id, claimant_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
