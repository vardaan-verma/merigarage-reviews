-- V15: Secure Garage Ownership Claims and Document Linkage
-- Engine: InnoDB, Charset: utf8mb4

ALTER TABLE garage_claims
    ADD COLUMN claimant_name VARCHAR(150) NULL,
    ADD COLUMN claimant_phone VARCHAR(30) NULL,
    ADD COLUMN claimant_email VARCHAR(150) NULL,
    ADD COLUMN business_reg_number VARCHAR(100) NULL;

ALTER TABLE garage_documents
    ADD COLUMN claim_id BIGINT UNSIGNED NULL,
    ADD COLUMN uploaded_by_user_id BIGINT UNSIGNED NULL,
    ADD CONSTRAINT fk_gd_claim FOREIGN KEY (claim_id) REFERENCES garage_claims (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_gd_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    ADD INDEX idx_gd_claim_id (claim_id),
    ADD INDEX idx_gd_claim_status (claim_id, verification_status);
