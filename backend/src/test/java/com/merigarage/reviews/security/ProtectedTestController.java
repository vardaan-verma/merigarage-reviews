package com.merigarage.reviews.security;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/test-protected")
public class ProtectedTestController {

    @GetMapping("/user-only")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, String>> userOnly() {
        return ResponseEntity.ok(Map.of("message", "User access granted"));
    }

    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> adminOnly() {
        return ResponseEntity.ok(Map.of("message", "Admin access granted"));
    }

    @GetMapping("/garage-approval-permission")
    @PreAuthorize("hasAuthority('GARAGE_APPROVAL')")
    public ResponseEntity<Map<String, String>> garageApprovalOnly() {
        return ResponseEntity.ok(Map.of("message", "Garage approval permission granted"));
    }

    @GetMapping("/content-moderation-permission")
    @PreAuthorize("hasAuthority('CONTENT_MODERATION')")
    public ResponseEntity<Map<String, String>> contentModerationOnly() {
        return ResponseEntity.ok(Map.of("message", "Content moderation permission granted"));
    }
}
