package com.merigarage.reviews.service.storage;

import com.merigarage.reviews.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalFileStorageServiceTest {

    @TempDir
    Path tempDir;

    private LocalFileStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new LocalFileStorageService(tempDir.toString());
    }

    @Test
    void storePhoto_ValidJpeg_StoresSuccessfully() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "shop.jpg", "image/jpeg", "dummy image bytes".getBytes()
        );

        String storageKey = storageService.storePhoto(file, 42L);

        assertThat(storageKey).startsWith("garages/42/photos/");
        assertThat(storageKey).contains("shop.jpg");
    }

    @Test
    void storePhoto_ValidPngAndWebp_StoresSuccessfully() {
        MockMultipartFile png = new MockMultipartFile(
                "file", "shop.png", "image/png", "png bytes".getBytes()
        );
        MockMultipartFile webp = new MockMultipartFile(
                "file", "shop.webp", "image/webp", "webp bytes".getBytes()
        );

        String pngKey = storageService.storePhoto(png, 42L);
        String webpKey = storageService.storePhoto(webp, 42L);

        assertThat(pngKey).startsWith("garages/42/photos/");
        assertThat(webpKey).startsWith("garages/42/photos/");
    }

    @Test
    void storePhoto_FileExceeding5MB_ThrowsValidationException() {
        byte[] oversizedBytes = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile oversized = new MockMultipartFile(
                "file", "large.jpg", "image/jpeg", oversizedBytes
        );

        assertThatThrownBy(() -> storageService.storePhoto(oversized, 42L))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("exceeds maximum limit");
    }

    @Test
    void storePhoto_UnsupportedContentType_ThrowsValidationException() {
        MockMultipartFile gif = new MockMultipartFile(
                "file", "animation.gif", "image/gif", "gif bytes".getBytes()
        );

        assertThatThrownBy(() -> storageService.storePhoto(gif, 42L))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Invalid file type 'image/gif'");
    }

    @Test
    void storePhoto_EmptyFile_ThrowsValidationException() {
        MockMultipartFile empty = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]
        );

        assertThatThrownBy(() -> storageService.storePhoto(empty, 42L))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("cannot be empty");
    }

    @Test
    void delete_NullOrBlankKey_NoOpAndSafe() {
        // Must not throw or delete root storage directory
        storageService.delete(null);
        storageService.delete("");
        storageService.delete("   ");
        assertThat(tempDir.toFile().exists()).isTrue();
    }

    private byte[] createValidImageBytes() {
        try {
            java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(10, 10, java.awt.image.BufferedImage.TYPE_INT_RGB);
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void storeUserProfilePhoto_ValidFile_StoresInUserDirectory() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.png", "image/png", createValidImageBytes()
        );

        String storageKey = storageService.storeUserProfilePhoto(file, 99L);

        assertThat(storageKey).startsWith("users/99/profile/");
        assertThat(storageKey).endsWith(".png");
    }

    @Test
    void storeDocument_ValidFile_StoresInDocumentDirectory() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "business_license.pdf", "application/pdf", "pdf bytes".getBytes()
        );

        String storageKey = storageService.storeDocument(file, 42L);

        assertThat(storageKey).startsWith("garages/42/documents/");
        assertThat(storageKey).endsWith(".pdf");
    }

    @Test
    void loadAsResource_NullOrBlankOrTraversal_ThrowsException() {
        assertThatThrownBy(() -> storageService.loadAsResource(null))
                .isInstanceOf(com.merigarage.reviews.exception.ResourceNotFoundException.class);
        assertThatThrownBy(() -> storageService.loadAsResource(""))
                .isInstanceOf(com.merigarage.reviews.exception.ResourceNotFoundException.class);
        assertThatThrownBy(() -> storageService.loadAsResource("../secret.txt"))
                .isInstanceOf(ValidationException.class);
    }
}
