package com.merigarage.reviews;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests that boot the full Spring application context
 * against a real MySQL database (resolved from DB_* environment variables).
 *
 * Set DB_PASSWORD (and optionally DB_URL / DB_USERNAME) before running.
 */
@SpringBootTest
@ActiveProfiles("test")
class ReviewsApiApplicationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** Verifies the Spring context loads and all auto-configuration wires up. */
    @Test
    void contextLoads() {
        // No assertions needed — a failure here means Spring context startup failed.
    }

    /** Verifies a real TCP connection to MySQL is established and SELECT 1 returns 1. */
    @Test
    void databaseConnectionIsAlive() {
        Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertThat(result).isEqualTo(1);
    }
}
