package com.merigarage.reviews.controller;

import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.security.UserPrincipal;
import com.merigarage.reviews.service.dto.UserDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final SecurityContextService securityContextService;

    public UserProfileController(SecurityContextService securityContextService) {
        this.securityContextService = securityContextService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDto> getProfile() {
        UserPrincipal principal = securityContextService.getRequiredPrincipal();
        return ResponseEntity.ok(UserDto.fromPrincipal(principal));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe() {
        return getProfile();
    }
}
