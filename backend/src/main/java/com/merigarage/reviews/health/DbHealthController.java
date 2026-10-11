package com.merigarage.reviews.health;

import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lightweight diagnostic endpoint that verifies the database connection
 * by executing {@code SELECT 1} against MySQL.
 *
 * <p>No credentials or internal exception details are exposed in the response.
 * Remove or secure this endpoint before going to production.
 */
@RestController
@RequestMapping("/api/internal/db-check")
public class DbHealthController {

    private final JdbcTemplate jdbcTemplate;

    public DbHealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * GET /api/internal/db-check
     *
     * @return 200 {"status":"UP"} when MySQL responds to SELECT 1,
     *         503 {"status":"DOWN"} otherwise.
     */
    @GetMapping
    public ResponseEntity<Map<String, String>> check() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(Map.of("status", "UP"));
        } catch (DataAccessException e) {
            // Log the real exception server-side but never expose it to the caller.
            return ResponseEntity.status(503).body(Map.of("status", "DOWN"));
        }
    }
}
