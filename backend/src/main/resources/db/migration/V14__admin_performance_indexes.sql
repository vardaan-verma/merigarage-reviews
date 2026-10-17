-- V14: Optimization indexes for admin search, analytics, and lifecycle queries
-- Engine: InnoDB

ALTER TABLE users ADD INDEX idx_users_created_at (created_at);
ALTER TABLE garages ADD INDEX idx_garages_status_verified (approval_status, is_verified);
ALTER TABLE garages ADD INDEX idx_garages_created_at (created_at);
ALTER TABLE garage_quote_requests ADD INDEX idx_gqr_status_created (status, created_at);
ALTER TABLE lead_events ADD INDEX idx_le_type_created (event_type, created_at);
