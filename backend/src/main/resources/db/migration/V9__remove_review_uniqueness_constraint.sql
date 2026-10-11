-- V9: Allow multiple reviews per user per garage by removing obsolete uniqueness constraint
-- Preserves existing reviews, foreign keys, rating checks, and status indexes.

ALTER TABLE reviews DROP INDEX uk_reviews_user_garage;
