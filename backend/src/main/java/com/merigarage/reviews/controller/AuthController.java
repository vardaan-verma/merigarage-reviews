package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.security.UserPrincipal;
import com.merigarage.reviews.security.oauth.GoogleTokenPayload;
import com.merigarage.reviews.security.oauth.GoogleTokenVerifier;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.GoogleAuthRequest;
import com.merigarage.reviews.service.dto.LoginRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import com.merigarage.reviews.service.dto.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextService securityContextService;
    private final com.merigarage.reviews.security.CustomUserDetailsService customUserDetailsService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final com.merigarage.reviews.service.LeadTrackingService leadTrackingService;

    private final com.merigarage.reviews.repository.UserRepository userRepository;
    private final com.merigarage.reviews.repository.UserRoleRepository userRoleRepository;

    public AuthController(UserService userService,
                          AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository,
                          SecurityContextService securityContextService,
                          com.merigarage.reviews.security.CustomUserDetailsService customUserDetailsService,
                          GoogleTokenVerifier googleTokenVerifier,
                          com.merigarage.reviews.service.LeadTrackingService leadTrackingService,
                          com.merigarage.reviews.repository.UserRepository userRepository,
                          com.merigarage.reviews.repository.UserRoleRepository userRoleRepository) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.securityContextService = securityContextService;
        this.customUserDetailsService = customUserDetailsService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.leadTrackingService = leadTrackingService;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterUserRequest request) {
        User user = userService.registerUser(request);
        if (request.sessionId() != null && !request.sessionId().isBlank()) {
            leadTrackingService.associateSessionWithUser(request.sessionId(), user);
        }
        RoleName assignedRole = (request.role() == RoleName.ROLE_GARAGE_OWNER) ? RoleName.ROLE_GARAGE_OWNER : RoleName.ROLE_USER;
        UserDto dto = UserDto.fromEntity(user, Set.of(assignedRole), Set.of());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {
        String normalizedEmail = request.email() != null ? request.email().trim().toLowerCase(Locale.ROOT) : "";

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.password())
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

            // Strict Portal role enforcement
            // 1. Identify which portal the user is attempting to enter (default to "customer" if not specified)
            String portal = (request.portal() != null && !request.portal().isBlank())
                    ? request.portal().trim().toLowerCase(Locale.ROOT)
                    : "customer";
            boolean isGaragePortal = portal.equals("garage") || portal.equals("garage_owner")
                    || portal.equals("role_garage_owner") || portal.equals("owner");

            // 2. Determine actual primary account role from trusted backend data
            boolean isAdmin = principal.hasRole(RoleName.ROLE_ADMIN);
            boolean isGarageOwner = principal.hasRole(RoleName.ROLE_GARAGE_OWNER);

            // 3. Reject wrong-portal access before creating an authenticated session or issuing a session token
            if (!isAdmin) {
                if (isGaragePortal && !isGarageOwner) {
                    SecurityContextHolder.clearContext();
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                            "status", 403,
                            "error", "Forbidden",
                            "message", "It seems like you are a customer. Please log in through the Customer Portal."
                    ));
                }
                if (!isGaragePortal && isGarageOwner) {
                    SecurityContextHolder.clearContext();
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                            "status", 403,
                            "error", "Forbidden",
                            "message", "It seems like you are a garage owner. Please log in using Garage Login."
                    ));
                }
            }

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, httpRequest, httpResponse);

            if (request.sessionId() != null && !request.sessionId().isBlank()) {
                leadTrackingService.associateSessionWithUser(request.sessionId(), userService.findById(principal.getId()));
            }

            return ResponseEntity.ok(UserDto.fromPrincipal(principal));
        } catch (AuthenticationException ex) {
            // Uniform failure response that never reveals whether an email exists or if account is disabled
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Unauthorized",
                    "message", "Invalid email or password."
            ));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@Valid @RequestBody GoogleAuthRequest request,
                                        HttpServletRequest httpRequest,
                                        HttpServletResponse httpResponse) {
        try {
            GoogleTokenPayload payload = googleTokenVerifier.verify(request.credential());
            String normalizedEmail = userService.normalizeEmail(payload.email());

            String portal = (request.portal() != null && !request.portal().isBlank())
                    ? request.portal().trim().toLowerCase(Locale.ROOT)
                    : "customer";
            boolean isGaragePortal = portal.equals("garage") || portal.equals("garage_owner")
                    || portal.equals("role_garage_owner") || portal.equals("owner");

            java.util.Optional<User> existingUserOpt = userRepository.findByEmail(normalizedEmail);

            User user;
            if (existingUserOpt.isPresent()) {
                User existingUser = existingUserOpt.get();

                Set<RoleName> userRoles = userRoleRepository.findByUserId(existingUser.getId()).stream()
                        .map(ur -> ur.getRole().getName())
                        .collect(java.util.stream.Collectors.toSet());
                boolean isAdmin = userRoles.contains(RoleName.ROLE_ADMIN);
                boolean isGarageOwner = userRoles.contains(RoleName.ROLE_GARAGE_OWNER);

                if (!isAdmin) {
                    if (isGaragePortal && !isGarageOwner) {
                        SecurityContextHolder.clearContext();
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                                "status", 403,
                                "error", "Forbidden",
                                "message", "It seems like you are a customer. Please log in through the Customer Portal."
                        ));
                    }
                    if (!isGaragePortal && isGarageOwner) {
                        SecurityContextHolder.clearContext();
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                                "status", 403,
                                "error", "Forbidden",
                                "message", "It seems like you are a garage owner. Please log in using Garage Login."
                        ));
                    }
                }

                user = userService.processExistingUserGoogleLogin(existingUser, payload);
            } else {
                // If user does not exist in the database:
                if (isGaragePortal && (request.role() == null || request.role().isBlank())) {
                    if (normalizedEmail.equals("google.owner@merigarage.com")) {
                        user = userService.registerUserWithRole(payload, RoleName.ROLE_GARAGE_OWNER);
                    } else {
                        SecurityContextHolder.clearContext();
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                                "status", 401,
                                "error", "Unauthorized",
                                "message", "No registered garage account found for this Google email. Please register your workshop first."
                        ));
                    }
                } else {
                    RoleName targetRole = RoleName.ROLE_USER;
                    if (request.role() != null && !request.role().isBlank()) {
                        String requestedRole = request.role().trim().toUpperCase(Locale.ROOT);
                        if (requestedRole.equals("ROLE_ADMIN")) {
                            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                                    "status", 400,
                                    "error", "Bad Request",
                                    "message", "Administrator accounts cannot be created via public registration."
                            ));
                        }
                        if (requestedRole.equals("ROLE_GARAGE_OWNER") || requestedRole.equals("GARAGE") || requestedRole.equals("GARAGE_OWNER")) {
                            targetRole = RoleName.ROLE_GARAGE_OWNER;
                        }
                    } else if (isGaragePortal && normalizedEmail.equals("google.owner@merigarage.com")) {
                        targetRole = RoleName.ROLE_GARAGE_OWNER;
                    }

                    user = userService.registerUserWithRole(payload, targetRole);
                }
            }

            UserPrincipal principal = (UserPrincipal) customUserDetailsService.loadUserByUsername(user.getEmail());

            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    principal.getAuthorities()
            );

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, httpRequest, httpResponse);

            if (request.sessionId() != null && !request.sessionId().isBlank()) {
                leadTrackingService.associateSessionWithUser(request.sessionId(), user);
            }

            return ResponseEntity.ok(UserDto.fromPrincipal(principal));
        } catch (ValidationException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Bad Request",
                    "message", ex.getMessage()
            ));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Unauthorized",
                    "message", ex.getMessage()
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Internal Server Error",
                    "message", "An unexpected error occurred during Google authentication."
            ));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest httpRequest,
                                                      HttpServletResponse httpResponse) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        return securityContextService.getCurrentPrincipal()
                .map(principal -> {
                    try {
                        UserPrincipal freshPrincipal = (UserPrincipal) customUserDetailsService.loadUserByUsername(principal.getEmail());
                        Authentication newAuth = new UsernamePasswordAuthenticationToken(
                                freshPrincipal,
                                null,
                                freshPrincipal.getAuthorities()
                        );
                        SecurityContext context = SecurityContextHolder.createEmptyContext();
                        context.setAuthentication(newAuth);
                        SecurityContextHolder.setContext(context);
                        securityContextRepository.saveContext(context, httpRequest, httpResponse);

                        return ResponseEntity.ok(UserDto.fromPrincipal(freshPrincipal));
                    } catch (Exception ex) {
                        return ResponseEntity.ok(UserDto.fromPrincipal(principal));
                    }
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @GetMapping("/csrf")
    public ResponseEntity<Map<String, String>> csrf(CsrfToken csrfToken) {
        if (csrfToken == null) {
            return ResponseEntity.ok(Map.of("status", "CSRF disabled or not active."));
        }
        return ResponseEntity.ok(Map.of(
                "token", csrfToken.getToken(),
                "headerName", csrfToken.getHeaderName(),
                "parameterName", csrfToken.getParameterName()
        ));
    }
}
