-- V2: Users, Base Roles, and Granular Admin Permissions
-- Engine: InnoDB, Charset: utf8mb4

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    email_verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_email UNIQUE (email),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    CONSTRAINT uk_roles_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed system roles catalogue
INSERT INTO roles (name, description) VALUES
    ('ROLE_USER', 'Standard registered customer'),
    ('ROLE_GARAGE_OWNER', 'Registered owner or manager of a garage listing'),
    ('ROLE_ADMIN', 'Platform administrator');

CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_permissions (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    CONSTRAINT uk_admin_permissions_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed granular admin permissions catalogue
INSERT INTO admin_permissions (code, description) VALUES
    ('GARAGE_APPROVAL', 'Review and approve/reject new garage listings and profile updates'),
    ('VERIFICATION_REVIEW', 'Review business documents and manage Verified Garage trust status'),
    ('CLAIM_MANAGEMENT', 'Review and approve/reject garage ownership claims'),
    ('CONTENT_MODERATION', 'Moderate reviews, responses, and photos, and manage master catalogues');

CREATE TABLE user_admin_permissions (
    user_id BIGINT UNSIGNED NOT NULL,
    permission_id TINYINT UNSIGNED NOT NULL,
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by_user_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, permission_id),
    CONSTRAINT fk_uap_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_uap_permission FOREIGN KEY (permission_id) REFERENCES admin_permissions (id) ON DELETE RESTRICT,
    CONSTRAINT fk_uap_granted_by FOREIGN KEY (granted_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
