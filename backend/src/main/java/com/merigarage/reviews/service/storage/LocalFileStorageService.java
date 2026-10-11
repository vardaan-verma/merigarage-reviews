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
}
