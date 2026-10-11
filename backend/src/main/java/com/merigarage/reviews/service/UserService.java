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
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       UserRoleRepository userRoleRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
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

        String normalizedEmail = normalizeEmail(request.email());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("User already exists with email: " + normalizedEmail);
        }

        String encodedPassword = passwordEncoder.encode(request.password());

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(encodedPassword);
        user.setFullName(request.fullName().trim());
        user.setPhoneNumber(request.phoneNumber() != null ? request.phoneNumber().trim() : null);
        user.setStatus(UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        Role userRole = roleRepository.findByName(RoleName.ROLE_USER)
                .orElseThrow(() -> new ResourceNotFoundException("Default role ROLE_USER not found in database."));

        UserRole mapping = new UserRole(savedUser, userRole);
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

    public String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
