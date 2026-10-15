package com.merigarage.reviews.security.oauth;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.merigarage.reviews.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
public class GoogleTokenVerifierImpl implements GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifierImpl.class);
    private static final String GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${app.oauth.google.client-id:}")
    private String configuredClientId;

    @Value("${app.oauth.google.allow-test-tokens:false}")
    private boolean allowTestTokens;

    public GoogleTokenVerifierImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Override
    public GoogleTokenPayload verify(String credential) {
        if (credential == null || credential.isBlank()) {
            throw new ValidationException("Google ID credential is required.");
        }

        String trimmedCredential = credential.trim();

        // Support test/demo tokens in development or test profiles
        if (allowTestTokens && (trimmedCredential.startsWith("test_google_token:") || trimmedCredential.startsWith("mock_google_token:"))) {
            return parseTestToken(trimmedCredential);
        }

        try {
            String url = GOOGLE_TOKENINFO_URL + URLEncoder.encode(trimmedCredential, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200 || response.body() == null || response.body().isBlank()) {
                log.warn("Google tokeninfo returned status {}: {}", response.statusCode(), response.body());
                throw new ValidationException("Invalid or expired Google authentication credential.");
            }

            JsonNode root = objectMapper.readTree(response.body());

            // 1. Verify issuer
            String iss = root.path("iss").asText(null);
            if (iss == null || (!iss.equals("accounts.google.com") && !iss.equals("https://accounts.google.com"))) {
                log.warn("Google token issuer validation failed: {}", iss);
                throw new ValidationException("Invalid Google token issuer.");
            }

            // 2. Verify email
            String email = root.path("email").asText(null);
            if (email == null || email.isBlank()) {
                throw new ValidationException("Google account did not provide an email address.");
            }

            // 3. Verify email verification
            JsonNode emailVerifiedNode = root.get("email_verified");
            boolean emailVerified = emailVerifiedNode != null &&
                    (emailVerifiedNode.asBoolean(false) || "true".equalsIgnoreCase(emailVerifiedNode.asText()));

            if (!emailVerified) {
                throw new ValidationException("Google account email is not verified.");
            }

            // 4. Verify audience if configured
            String aud = root.path("aud").asText(null);
            if (configuredClientId != null && !configuredClientId.isBlank()) {
                if (!configuredClientId.trim().equals(aud)) {
                    log.warn("Google token audience mismatch. Configured: {}, Received: {}", configuredClientId, aud);
                    throw new ValidationException("Google token audience mismatch.");
                }
            }

            String sub = root.path("sub").asText("");
            String name = root.path("name").asText(null);
            String picture = root.path("picture").asText(null);

            return new GoogleTokenPayload(sub, email, emailVerified, name, picture, aud, iss);
        } catch (ValidationException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to verify Google token with Google Identity Services", ex);
            throw new ValidationException("Unable to verify Google credential with authentication provider.");
        }
    }

    private GoogleTokenPayload parseTestToken(String token) {
        String[] parts = token.split(":", 3);
        String email = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : "test.google.user@merigarage.com";
        String name = parts.length > 2 && !parts[2].isBlank() ? parts[2].trim() : "Demo Google User";

        log.info("Simulating Google OAuth verification with test token for email: {}", email);
        return new GoogleTokenPayload(
                "test-sub-" + email.hashCode(),
                email,
                true,
                name,
                null,
                configuredClientId,
                "https://accounts.google.com"
        );
    }
}
