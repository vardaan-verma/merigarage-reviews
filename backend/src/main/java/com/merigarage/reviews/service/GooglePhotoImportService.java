package com.merigarage.reviews.service;

import com.merigarage.reviews.service.storage.FileStorageService;
import com.merigarage.reviews.service.storage.LocalFileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;

@Service
public class GooglePhotoImportService {

    private static final Logger log = LoggerFactory.getLogger(GooglePhotoImportService.class);

    // Minimal 1x1 valid PNG image byte array for mock/test tokens
    private static final byte[] MOCK_PNG_BYTES = new byte[] {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, (byte) 0xC4,
            (byte) 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, (byte) 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, (byte) 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE,
            0x42, 0x60, (byte) 0x82
    };

    private final FileStorageService fileStorageService;
    private final HttpClient httpClient;

    public GooglePhotoImportService(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Securely downloads and imports a Google profile photo for durable storage.
     * Enforces HTTPS, Google CDN hostname validation, SSRF checks, request timeouts,
     * size limits, content-type checks, and magic byte validation.
     *
     * @param photoUrl The verified Google profile picture URL from Google ID token
     * @param userId The database user ID
     * @return The durable storage key if imported successfully, or null if download/validation fails
     */
    public String importGooglePhoto(String photoUrl, Long userId) {
        if (photoUrl == null || photoUrl.isBlank() || userId == null) {
            return null;
        }

        String trimmedUrl = photoUrl.trim();

        // Support test/mock tokens in testing environments without network calls
        if (trimmedUrl.startsWith("mock_photo:") || trimmedUrl.startsWith("test_photo:")) {
            log.info("Importing simulated test photo for user ID {}", userId);
            try {
                return fileStorageService.storeUserProfilePhotoBytes(MOCK_PNG_BYTES, "image/png", userId);
            } catch (Exception ex) {
                log.warn("Failed to store mock photo for user {}: {}", userId, ex.getMessage());
                return null;
            }
        }

        try {
            URI uri = URI.create(trimmedUrl);

            // 1. Enforce HTTPS only
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                log.warn("Rejected non-HTTPS Google profile photo URL: {}", trimmedUrl);
                return null;
            }

            // 2. Validate hostname belongs to verified Google domains
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                log.warn("Invalid host in Google profile photo URL: {}", trimmedUrl);
                return null;
            }
            String lowerHost = host.toLowerCase(Locale.ROOT);
            boolean isAllowedGoogleHost = lowerHost.equals("googleusercontent.com") ||
                    lowerHost.endsWith(".googleusercontent.com") ||
                    lowerHost.endsWith(".google.com");

            if (!isAllowedGoogleHost) {
                log.warn("Rejected untrusted non-Google host in profile photo URL: {}", host);
                return null;
            }

            // 3. Prevent SSRF by checking resolved IP addresses
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress addr : addresses) {
                if (addr.isLoopbackAddress() || addr.isAnyLocalAddress() || addr.isLinkLocalAddress() || addr.isSiteLocalAddress()) {
                    log.warn("SSRF protection: host {} resolved to private/loopback IP {}", host, addr.getHostAddress());
                    return null;
                }
            }

            // 4. Download photo with 5s read timeout
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(5))
                    .header("Accept", "image/webp,image/png,image/jpeg")
                    .header("User-Agent", "MeriGarage-Reviews/1.0")
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() != 200) {
                log.warn("Google photo download returned HTTP status {}: {}", response.statusCode(), trimmedUrl);
                return null;
            }

            byte[] bytes = response.body();
            if (bytes == null || bytes.length == 0) {
                log.warn("Empty response body from Google photo URL: {}", trimmedUrl);
                return null;
            }

            if (bytes.length > LocalFileStorageService.MAX_PHOTO_SIZE_BYTES) {
                log.warn("Google photo exceeds maximum allowed size ({} bytes): {}", bytes.length, trimmedUrl);
                return null;
            }

            // 5. Verify Content-Type
            String rawContentType = response.headers().firstValue("Content-Type").orElse("image/jpeg");
            String contentType = rawContentType.contains(";") ? rawContentType.split(";")[0].trim() : rawContentType.trim();
            if (!contentType.equalsIgnoreCase("image/jpeg") &&
                    !contentType.equalsIgnoreCase("image/png") &&
                    !contentType.equalsIgnoreCase("image/webp")) {
                // If content type was generic application/octet-stream, probe magic bytes
                if (LocalFileStorageService.hasValidImageMagicBytes(bytes)) {
                    contentType = LocalFileStorageService.detectContentTypeFromBytes(bytes);
                } else {
                    log.warn("Google photo returned unsupported content type '{}': {}", contentType, trimmedUrl);
                    return null;
                }
            }

            // 6. Validate magic bytes
            if (!LocalFileStorageService.hasValidImageMagicBytes(bytes)) {
                log.warn("Google photo failed image magic bytes check: {}", trimmedUrl);
                return null;
            }

            // 7. Store durably in file storage
            String storageKey = fileStorageService.storeUserProfilePhotoBytes(bytes, contentType, userId);
            log.info("Successfully imported and stored Google profile photo for user {} under key {}", userId, storageKey);
            return storageKey;
        } catch (Throwable ex) {
            log.warn("Failed to download and import Google profile photo from {}: {}", trimmedUrl, ex.getMessage());
            return null;
        }
    }
}
