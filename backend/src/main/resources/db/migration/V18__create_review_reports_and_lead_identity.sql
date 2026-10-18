-- V18: Create Review Reports Table and Add Customer Name to Lead Events
-- Engine: InnoDB, Charset: utf8mb4

-- 1. Add customer_name column to lead_events to store customer name when provided directly in lead forms
ALTER TABLE lead_events ADD COLUMN customer_name VARCHAR(150) NULL AFTER user_id;

-- 2. Create review_reports table for garage owners and users to report problematic reviews for moderation
CREATE TABLE review_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    review_id BIGINT UNSIGNED NOT NULL,
    garage_id BIGINT UNSIGNED NOT NULL,
    reporter_user_id BIGINT UNSIGNED NOT NULL,
    report_reason VARCHAR(100) NOT NULL,
    details TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    decision_notes VARCHAR(255) NULL,
    resolved_by_admin_id BIGINT UNSIGNED NULL,
    resolved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rr_review_target FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_garage_target FOREIGN KEY (garage_id) REFERENCES garages (id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_reporter_user FOREIGN KEY (reporter_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_admin_resolver FOREIGN KEY (resolved_by_admin_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_review_reports_status (status, created_at),
    INDEX idx_review_reports_review (review_id),
    INDEX idx_review_reports_garage (garage_id),
    INDEX idx_review_reports_reporter (reporter_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
