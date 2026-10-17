-- V16: Add granular administrative permissions and create administrative audit trail

-- 1. Insert new granular admin permissions
INSERT INTO admin_permissions (code, description) VALUES
    ('USER_MANAGEMENT', 'Manage user accounts, status, suspension and administrative roles and permissions'),
    ('LEAD_ACCESS', 'Access visitor search events, leads, customer contact queries and analytics'),
    ('QUOTE_OVERSIGHT', 'Inspect and moderate customer quote requests and quotations'),
    ('DATA_EXPORT', 'Export sensitive system reports, audit records, leads and user datasets')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 2. Create admin audit log table for tracing all consequential administrative actions
CREATE TABLE admin_audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    action_type VARCHAR(60) NOT NULL,
    target_type VARCHAR(40) NOT NULL,
    target_id BIGINT UNSIGNED NULL,
    outcome VARCHAR(30) NOT NULL,
    reason TEXT NULL,
    metadata_json TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_admin_user FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_audit_admin_created (admin_user_id, created_at),
    INDEX idx_audit_target (target_type, target_id),
    INDEX idx_audit_action_created (action_type, created_at),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed granular permissions to existing administrators
INSERT IGNORE INTO user_admin_permissions (user_id, permission_id, granted_by_user_id)
SELECT ur.user_id, ap.id, ur.user_id
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id AND r.name = 'ROLE_ADMIN'
CROSS JOIN admin_permissions ap;
