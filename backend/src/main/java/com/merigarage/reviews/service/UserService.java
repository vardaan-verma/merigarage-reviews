package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.UserStatus;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import com.merigarage.reviews.security.oauth.GoogleTokenPayload;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import com.merigarage.reviews.service.dto.UpdateProfileRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class UserService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.merigarage.reviews.service.storage.FileStorageService fileStorageService;
    private final GooglePhotoImportService googlePhotoImportService;

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       UserRoleRepository userRoleRepository,
                       PasswordEncoder passwordEncoder,
                       com.merigarage.reviews.service.storage.FileStorageService fileStorageService,
                       GooglePhotoImportService googlePhotoImportService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
        this.googlePhotoImportService = googlePhotoImportService;
    }

    @Transactional
    public User registerUser(RegisterUserRequest request) {
        if (request == null) {
            throw new ValidationException("Registration request cannot be null.");
        }
        if (request.email() == null || request.email().isBlank()) {
            throw new ValidationException("Email is required.");
        }
        if (request.password() == null || request.password().length() < 8) {
            throw new ValidationException("Password must be at least 8 characters long.");
        }

        if (request.role() == RoleName.ROLE_ADMIN) {
            throw new ValidationException("Administrator accounts cannot be registered publicly.");
        }

        String normalizedEmail = normalizeEmail(request.email());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("User already exists with email: " + normalizedEmail);
        }

        String encodedPassword = passwordEncoder.encode(request.password());

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(encodedPassword);
        user.setFullName(request.fullName().trim());
        user.setPhoneNumber(normalizePhoneNumber(request.phoneNumber()));
        user.setRegistrationSource(request.registrationSource() != null ? request.registrationSource().trim() : null);
        user.setConsentStatus(request.consentStatus() != null ? request.consentStatus().trim() : "ESSENTIAL_ONLY");
        user.setStatus(UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        final RoleName targetRole = (request.role() == RoleName.ROLE_GARAGE_OWNER)
                ? RoleName.ROLE_GARAGE_OWNER
                : RoleName.ROLE_USER;

        Role assignedRole = roleRepository.findByName(targetRole)
                .orElseThrow(() -> new ResourceNotFoundException("Default role " + targetRole + " not found in database."));

        UserRole mapping = new UserRole(savedUser, assignedRole);
        userRoleRepository.save(mapping);

        return savedUser;
    }

    public User findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    public User findByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        return userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + normalizedEmail));
    }

    @Transactional
    public User processExistingUserGoogleLogin(User existingUser, GoogleTokenPayload payload) {
        if (existingUser.getStatus() == UserStatus.SUSPENDED) {
            throw new ValidationException("Account is suspended. Please contact platform support.");
        }
        if (existingUser.getStatus() == UserStatus.DEACTIVATED) {
            throw new ValidationException("Account is deactivated.");
        }
        if (existingUser.getEmailVerifiedAt() == null) {
            existingUser.setEmailVerifiedAt(LocalDateTime.now());
        }
        if ((existingUser.getFullName() == null || existingUser.getFullName().isBlank())
                && payload.name() != null && !payload.name().isBlank()) {
            existingUser.setFullName(payload.name().trim());
        }

        return userRepository.save(existingUser);
    }

    @Transactional
    public User registerUserWithRole(GoogleTokenPayload payload, RoleName targetRole) {
        if (targetRole == RoleName.ROLE_ADMIN) {
            throw new ValidationException("Administrator accounts cannot be created via public registration.");
        }

        String normalizedEmail = normalizeEmail(payload.email());
        String fullName = (payload.name() != null && !payload.name().isBlank())
                ? payload.name().trim()
                : normalizedEmail.split("@")[0];

        User newUser = new User();
        newUser.setEmail(normalizedEmail);
        newUser.setFullName(fullName);
        newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        newUser.setStatus(UserStatus.ACTIVE);
        newUser.setEmailVerifiedAt(LocalDateTime.now());
        newUser.setIsCustomPhoto(false);

        User savedUser = userRepository.save(newUser);

        Role roleEntity = roleRepository.findByName(targetRole)
                .orElseThrow(() -> new ResourceNotFoundException("Role " + targetRole + " not found in database."));

        UserRole mapping = new UserRole(savedUser, roleEntity);
        userRoleRepository.save(mapping);

        return savedUser;
    }

    @Transactional
    public User tryImportInitialGooglePhoto(Long userId, String pictureUrl) {
        if (userId == null || pictureUrl == null || pictureUrl.isBlank()) {
            return userId != null ? findById(userId) : null;
        }

        User user = findById(userId);

        // Respect user customization:
        // A user-uploaded custom photo must NOT be overwritten during subsequent Google logins.
        // Also if user already has an imported or existing photo, preserve it.
        boolean hasExistingPhoto = Boolean.TRUE.equals(user.getIsCustomPhoto())
                || (user.getProfilePhotoStorageKey() != null && !user.getProfilePhotoStorageKey().isBlank())
                || (user.getProfilePhotoUrl() != null && !user.getProfilePhotoUrl().isBlank());

        if (hasExistingPhoto) {
            log.info("User {} already has a profile photo; skipping Google photo import to preserve existing photo.", userId);
            return user;
        }

        try {
            String storageKey = googlePhotoImportService.importGooglePhoto(pictureUrl, user.getId());
            if (storageKey != null) {
                user.setProfilePhotoStorageKey(storageKey);
                user.setProfilePhotoUrl("/api/users/" + user.getId() + "/photo");
                user.setIsCustomPhoto(false);
                return userRepository.save(user);
            }
        } catch (Throwable t) {
            log.warn("Safe diagnostic: non-fatal Google photo import failure for user {}: {}", userId, t.getMessage());
        }

        return user;
    }

    @Transactional
    public User loginOrRegisterWithGoogle(GoogleTokenPayload payload) {
        if (payload == null || payload.email() == null || payload.email().isBlank()) {
            throw new ValidationException("Google user profile must contain a valid email.");
        }

        String normalizedEmail = normalizeEmail(payload.email());
        return userRepository.findByEmail(normalizedEmail)
                .map(existingUser -> processExistingUserGoogleLogin(existingUser, payload))
                .orElseGet(() -> registerUserWithRole(payload, RoleName.ROLE_USER));
    }

    public String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static String normalizePhoneNumber(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() == 10) {
            return "+91" + digits;
        } else if (digits.length() == 12 && digits.startsWith("91")) {
            return "+" + digits;
        } else if (digits.length() > 0 && digits.length() <= 15) {
            return "+" + digits;
        }
        return null;
    }

    @Transactional
    public User updateUserProfile(Long userId, UpdateProfileRequest request) {
        User user = findById(userId);

        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }

        if (request.phoneNumber() != null) {
            user.setPhoneNumber(normalizePhoneNumber(request.phoneNumber()));
        }

        if (request.profilePhotoUrl() != null && !request.profilePhotoUrl().isBlank()) {
            user.setProfilePhotoUrl(request.profilePhotoUrl().trim());
        }

        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            if (request.currentPassword() == null || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                throw new ValidationException("Current password does not match.");
            }
            if (request.newPassword().length() < 8) {
                throw new ValidationException("New password must be at least 8 characters long.");
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        }

        return userRepository.save(user);
    }

    @Transactional
    public User uploadProfilePhoto(Long userId, MultipartFile file) {
        if (userId == null) {
            throw new ValidationException("User ID is required.");
        }
        User user = findById(userId);
        String oldStorageKey = user.getProfilePhotoStorageKey();

        String newStorageKey = fileStorageService.storeUserProfilePhoto(file, userId);
        try {
            user.setProfilePhotoStorageKey(newStorageKey);
            user.setProfilePhotoUrl("/api/users/" + userId + "/photo");
            user.setIsCustomPhoto(true);
            User saved = userRepository.save(user);

            // Clean up previous photo if not referenced elsewhere
            if (oldStorageKey != null && !oldStorageKey.equals(newStorageKey)) {
                if (userRepository.countByProfilePhotoStorageKey(oldStorageKey) == 0) {
                    fileStorageService.delete(oldStorageKey);
                }
            }
            return saved;
        } catch (Exception ex) {
            fileStorageService.delete(newStorageKey);
            throw ex;
        }
    }

    @Transactional
    public User deleteProfilePhoto(Long userId) {
        if (userId == null) {
            throw new ValidationException("User ID is required.");
        }
        User user = findById(userId);
        String oldStorageKey = user.getProfilePhotoStorageKey();

        user.setProfilePhotoStorageKey(null);
        user.setProfilePhotoUrl(null);
        user.setIsCustomPhoto(false);
        User saved = userRepository.save(user);

        if (oldStorageKey != null && userRepository.countByProfilePhotoStorageKey(oldStorageKey) == 0) {
            fileStorageService.delete(oldStorageKey);
        }
        return saved;
    }
}
