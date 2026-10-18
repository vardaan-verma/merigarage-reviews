package com.merigarage.reviews.service.storage;

import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    public static final long MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024L; // 5 MB
    public static final long MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024L; // 10 MB

    private static final Set<String> ALLOWED_PHOTO_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final Set<String> ALLOWED_DOC_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png"
    );

    private final Path rootLocation;

    public LocalFileStorageService(@Value("${app.storage.base-path:uploads}") String basePath) {
        this.rootLocation = Paths.get(basePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            throw new IllegalStateException("Could not initialize storage directory at: " + rootLocation, e);
        }
    }

    @Override
    public String storePhoto(MultipartFile file, Long garageId) {
        validateFile(file, MAX_PHOTO_SIZE_BYTES, ALLOWED_PHOTO_TYPES, "photo");
        String relativeSubDir = "garages/" + garageId + "/photos";
        return storeInternal(file, relativeSubDir);
    }

    @Override
    public String storeDocument(MultipartFile file, Long garageId) {
        validateFile(file, MAX_DOC_SIZE_BYTES, ALLOWED_DOC_TYPES, "document");
        String relativeSubDir = "garages/" + garageId + "/documents";
        return storeInternal(file, relativeSubDir);
    }

    @Override
    public String storeUserProfilePhoto(MultipartFile file, Long userId) {
        if (userId == null) {
            throw new ValidationException("User ID is required for storing profile photo.");
        }
        validateFile(file, MAX_PHOTO_SIZE_BYTES, ALLOWED_PHOTO_TYPES, "profile photo");
        try {
            byte[] bytes = file.getBytes();
            validateImageContent(bytes, file.getContentType());
            String relativeSubDir = "users/" + userId + "/profile";
            return storeBytesInternal(bytes, file.getOriginalFilename(), file.getContentType(), relativeSubDir);
        } catch (IOException e) {
            throw new ValidationException("Failed to read profile photo: " + e.getMessage());
        }
    }

    @Override
    public String storeUserProfilePhotoBytes(byte[] bytes, String contentType, Long userId) {
        if (userId == null) {
            throw new ValidationException("User ID is required for storing profile photo.");
        }
        if (bytes == null || bytes.length == 0) {
            throw new ValidationException("Profile photo data cannot be empty.");
        }
        if (bytes.length > MAX_PHOTO_SIZE_BYTES) {
            throw new ValidationException(String.format("File size (%d bytes) exceeds maximum limit of %d bytes.", bytes.length, MAX_PHOTO_SIZE_BYTES));
        }
        if (contentType == null || !ALLOWED_PHOTO_TYPES.contains(contentType.toLowerCase())) {
            throw new ValidationException(String.format("Invalid file type '%s'. Allowed photo types: %s", contentType, ALLOWED_PHOTO_TYPES));
        }
        validateImageContent(bytes, contentType);
        String relativeSubDir = "users/" + userId + "/profile";
        return storeBytesInternal(bytes, "avatar", contentType, relativeSubDir);
    }

    @Override
    public Resource loadAsResource(String storageKey) {
        try {
            Path file = this.rootLocation.resolve(storageKey).normalize();
            if (!file.startsWith(this.rootLocation)) {
                throw new ValidationException("Invalid storage key path traversal attempt.");
            }
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Could not read file for storage key: " + storageKey);
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Invalid file URL for storage key: " + storageKey);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Path file = this.rootLocation.resolve(storageKey).normalize();
            if (file.startsWith(this.rootLocation)) {
                Files.deleteIfExists(file);
            }
        } catch (IOException ignored) {
        }
    }

    private String storeInternal(MultipartFile file, String relativeSubDir) {
        try {
            Path targetDir = this.rootLocation.resolve(relativeSubDir).normalize();
            if (!targetDir.startsWith(this.rootLocation)) {
                throw new ValidationException("Directory traversal attack detected.");
            }
            Files.createDirectories(targetDir);

            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String sanitizedFilename = sanitizeFilename(originalFilename);
            String uniqueName = UUID.randomUUID() + "-" + sanitizedFilename;

            Path targetPath = targetDir.resolve(uniqueName).normalize();
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            return relativeSubDir + "/" + uniqueName;
        } catch (IOException e) {
            throw new ValidationException("Failed to store file: " + e.getMessage());
        }
    }

    private void validateFile(MultipartFile file, long maxBytes, Set<String> allowedTypes, String fileTypeDesc) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Uploaded " + fileTypeDesc + " file cannot be empty.");
        }
        if (file.getSize() > maxBytes) {
            throw new ValidationException(String.format("File size (%d bytes) exceeds maximum limit of %d bytes.", file.getSize(), maxBytes));
        }
        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType.toLowerCase())) {
            throw new ValidationException(String.format("Invalid file type '%s'. Allowed %s types: %s", contentType, fileTypeDesc, allowedTypes));
        }
    }

    private String sanitizeFilename(String filename) {
        String clean = Paths.get(filename).getFileName().toString();
        return clean.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String storeBytesInternal(byte[] bytes, String originalFilename, String contentType, String relativeSubDir) {
        try {
            Path targetDir = this.rootLocation.resolve(relativeSubDir).normalize();
            if (!targetDir.startsWith(this.rootLocation)) {
                throw new ValidationException("Directory traversal attack detected.");
            }
            Files.createDirectories(targetDir);

            String ext = determineExtension(originalFilename, contentType);
            String uniqueName = UUID.randomUUID() + (ext.startsWith(".") ? ext : ("." + ext));

            Path targetPath = targetDir.resolve(uniqueName).normalize();
            Files.write(targetPath, bytes);

            return relativeSubDir + "/" + uniqueName;
        } catch (IOException e) {
            throw new ValidationException("Failed to store file: " + e.getMessage());
        }
    }

    private String determineExtension(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            String ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            if (ext.equals(".jpg") || ext.equals(".jpeg") || ext.equals(".png") || ext.equals(".webp")) {
                return ext;
            }
        }
        if (contentType != null) {
            String ct = contentType.toLowerCase();
            if (ct.contains("png")) return ".png";
            if (ct.contains("webp")) return ".webp";
            if (ct.contains("jpeg") || ct.contains("jpg")) return ".jpg";
        }
        return ".jpg";
    }

    public static boolean hasValidImageMagicBytes(byte[] bytes) {
        if (bytes == null || bytes.length < 12) {
            return false;
        }
        // JPEG: FF D8 FF
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return true;
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
                bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) {
            return true;
        }
        // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
                bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return true;
        }
        return false;
    }

    public static void validateImageContent(byte[] bytes, String contentType) {
        if (!hasValidImageMagicBytes(bytes)) {
            throw new ValidationException("Invalid image content. File signature does not match supported image format (JPEG, PNG, WebP).");
        }
        String lower = contentType != null ? contentType.toLowerCase() : "";
        if (lower.contains("jpeg") || lower.contains("jpg") || lower.contains("png")) {
            try {
                java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes));
                if (img == null || img.getWidth() <= 0 || img.getHeight() <= 0) {
                    throw new ValidationException("Corrupted or unreadable image file data.");
                }
            } catch (IOException e) {
                throw new ValidationException("Failed to decode image data: " + e.getMessage());
            }
        }
    }
}
