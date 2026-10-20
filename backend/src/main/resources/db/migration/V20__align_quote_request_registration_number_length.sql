-- V20: Align quote request registration number column length with user_vehicles table
-- Engine: InnoDB, Charset: utf8mb4

ALTER TABLE garage_quote_requests
    MODIFY COLUMN registration_number VARCHAR(50) NULL;
