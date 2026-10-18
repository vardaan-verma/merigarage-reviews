package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.security.UserPrincipal;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.UpdateProfileRequest;
import com.merigarage.reviews.service.dto.UserDto;
import com.merigarage.reviews.service.storage.FileStorageService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.merigarage.reviews.security.CustomUserDetailsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;

import java.time.Duration;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final SecurityContextService securityContextService;
    private final UserService userService;
    private final FileStorageService fileStorageService;
    private final CustomUserDetailsService customUserDetailsService;
    private final SecurityContextRepository securityContextRepository;

    public UserProfileController(SecurityContextService securityContextService,
                                 UserService userService,
                                 FileStorageService fileStorageService,
                                 CustomUserDetailsService customUserDetailsService,
                                 SecurityContextRepository securityContextRepository) {
        this.securityContextService = securityContextService;
        this.userService = userService;
        this.fileStorageService = fileStorageService;
        this.customUserDetailsService = customUserDetailsService;
        this.securityContextRepository = securityContextRepository;
    }

    private void refreshSecurityContext(String email, HttpServletRequest request, HttpServletResponse response) {
        try {
            UserPrincipal freshPrincipal = (UserPrincipal) customUserDetailsService.loadUserByUsername(email);
            Authentication newAuth = new UsernamePasswordAuthenticationToken(
                    freshPrincipal,
                    null,
                    freshPrincipal.getAuthorities()
            );
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(newAuth);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);
        } catch (Exception ignored) {
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDto> getProfile() {
        UserPrincipal principal = securityContextService.getRequiredPrincipal();
        User user = userService.findById(principal.getId());
        return ResponseEntity.ok(UserDto.fromEntity(user, principal.getRoles(), principal.getPermissions()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe() {
        return getProfile();
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDto> updateProfile(@Valid @RequestBody UpdateProfileRequest request,
                                                 HttpServletRequest httpRequest,
                                                 HttpServletResponse httpResponse) {
        UserPrincipal principal = securityContextService.getRequiredPrincipal();
        User updatedUser = userService.updateUserProfile(principal.getId(), request);
        refreshSecurityContext(updatedUser.getEmail(), httpRequest, httpResponse);
        return ResponseEntity.ok(UserDto.fromEntity(updatedUser, principal.getRoles(), principal.getPermissions()));
    }

    @PostMapping(value = "/profile/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDto> uploadProfilePhoto(@RequestParam("file") MultipartFile file,
                                                      HttpServletRequest httpRequest,
                                                      HttpServletResponse httpResponse) {
        UserPrincipal principal = securityContextService.getRequiredPrincipal();
        User updatedUser = userService.uploadProfilePhoto(principal.getId(), file);
        refreshSecurityContext(updatedUser.getEmail(), httpRequest, httpResponse);
        return ResponseEntity.ok(UserDto.fromEntity(updatedUser, principal.getRoles(), principal.getPermissions()));
    }

    @DeleteMapping("/profile/photo")
    public ResponseEntity<UserDto> deleteProfilePhoto(HttpServletRequest httpRequest,
                                                      HttpServletResponse httpResponse) {
        UserPrincipal principal = securityContextService.getRequiredPrincipal();
        User updatedUser = userService.deleteProfilePhoto(principal.getId());
        refreshSecurityContext(updatedUser.getEmail(), httpRequest, httpResponse);
        return ResponseEntity.ok(UserDto.fromEntity(updatedUser, principal.getRoles(), principal.getPermissions()));
    }

    @GetMapping("/profile/photo")
    public ResponseEntity<Resource> getMyProfilePhoto() {
        UserPrincipal principal = securityContextService.getRequiredPrincipal();
        return getUserPhoto(principal.getId());
    }

    @GetMapping("/{userId}/photo")
    public ResponseEntity<Resource> getUserPhoto(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user.getProfilePhotoStorageKey() == null || user.getProfilePhotoStorageKey().isBlank()) {
            throw new ResourceNotFoundException("User does not have an uploaded profile photo.");
        }

        Resource resource = fileStorageService.loadAsResource(user.getProfilePhotoStorageKey());
        String keyLower = user.getProfilePhotoStorageKey().toLowerCase();

        MediaType mediaType = MediaType.IMAGE_JPEG;
        if (keyLower.endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        } else if (keyLower.endsWith(".webp")) {
            mediaType = MediaType.parseMediaType("image/webp");
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic().mustRevalidate())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(resource);
    }
}
