-- V19: Add durable profile photo storage key and custom photo indicator to users table
-- Engine: InnoDB, Charset: utf8mb4

ALTER TABLE users
    ADD COLUMN profile_photo_storage_key VARCHAR(500) NULL AFTER profile_photo_url,
    ADD COLUMN is_custom_photo BOOLEAN NOT NULL DEFAULT FALSE AFTER profile_photo_storage_key;
