-- V10: Add Google Maps URL column to garages
-- Engine: InnoDB, Charset: utf8mb4

ALTER TABLE garages ADD COLUMN google_maps_url VARCHAR(500) NULL AFTER website_url;
