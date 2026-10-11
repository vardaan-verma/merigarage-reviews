package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GaragePhoto;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GaragePhotoRepository;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import com.merigarage.reviews.service.dto.DocumentUploadRequest;
import com.merigarage.reviews.service.dto.GarageDocumentDto;
import com.merigarage.reviews.service.dto.PhotoUploadRequest;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GarageMediaServiceTest {

    @Autowired
    private GarageMediaService mediaService;

    @Autowired
    private GarageService garageService;

    @Autowired
    private UserService userService;

    @Autowired
    private GaragePhotoRepository photoRepository;

    private User createTestUser() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        return userService.registerUser(new RegisterUserRequest(
                "uploader." + uid + "@example.com",
                "Password123!",
                "Media User",
                "9876543210"
        ));
    }

    private Garage createTestGarage(User creator) {
        return garageService.createGarage(new CreateGarageRequest(
                "Photo Test Garage " + UUID.randomUUID().toString().substring(0, 8),
                "Description",
                "Address 1",
                null,
                "Delhi",
                "Delhi",
                "110001",
                "+911122334455",
                null,
                null,
                null,
                null
        ), creator);
    }

    @Test
    void addPhoto_EnforcesMaximumTenActivePhotos() {
        User user = createTestUser();
        Garage garage = createTestGarage(user);

        // Upload 10 photos successfully
        for (int i = 1; i <= 10; i++) {
            PhotoUploadRequest req = new PhotoUploadRequest(
                    "garages/" + garage.getId() + "/photo_" + i + ".jpg",
                    "image/jpeg",
                    1024L * 100,
                    "Photo " + i,
                    (byte) i,
                    false
            );
            mediaService.addPhoto(garage.getId(), req, user);
        }

        // 11th photo must be rejected
        PhotoUploadRequest req11 = new PhotoUploadRequest(
                "garages/" + garage.getId() + "/photo_11.jpg",
                "image/jpeg",
                1024L * 100,
                "Photo 11",
                (byte) 11,
                false
        );

        assertThatThrownBy(() -> mediaService.addPhoto(garage.getId(), req11, user))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Maximum limit of 10 active photos reached");
    }

    @Test
    void addPhoto_And_SetCoverPhoto_EnsuresOnlyOneCoverPhotoAtAnyTime() {
        User user = createTestUser();
        Garage garage = createTestGarage(user);

        // First photo uploaded becomes cover by default
        GaragePhoto photo1 = mediaService.addPhoto(garage.getId(), new PhotoUploadRequest(
                "photo1.jpg", "image/jpeg", 2048L, "First photo", (byte) 1, true
        ), user);
        assertThat(photo1.getIsCover()).isTrue();

        // Second photo uploaded with isCover = true must unset photo1 as cover
        GaragePhoto photo2 = mediaService.addPhoto(garage.getId(), new PhotoUploadRequest(
                "photo2.jpg", "image/jpeg", 2048L, "Second photo", (byte) 2, true
        ), user);
        assertThat(photo2.getIsCover()).isTrue();

        GaragePhoto reloadedPhoto1 = photoRepository.findById(photo1.getId()).orElseThrow();
        assertThat(reloadedPhoto1.getIsCover()).isFalse();

        // Now explicitly set photo1 back to cover
        mediaService.setCoverPhoto(garage.getId(), photo1.getId(), user);

        reloadedPhoto1 = photoRepository.findById(photo1.getId()).orElseThrow();
        GaragePhoto reloadedPhoto2 = photoRepository.findById(photo2.getId()).orElseThrow();

        assertThat(reloadedPhoto1.getIsCover()).isTrue();
        assertThat(reloadedPhoto2.getIsCover()).isFalse();
    }

    @Test
    void uploadDocument_KeepsStorageKeyPrivateInSummaryDto() {
        User user = createTestUser();
        Garage garage = createTestGarage(user);

        DocumentUploadRequest req = new DocumentUploadRequest(
                DocumentType.TRADE_LICENSE,
                "private/secure/vault/garage_license_secret_key.pdf",
                "license.pdf",
                "application/pdf",
                1024L * 500
        );

        mediaService.uploadDocument(garage.getId(), req, user);

        List<GarageDocumentDto> dtos = mediaService.getPublicDocumentSummaries(garage.getId());
        assertThat(dtos).hasSize(1);
        GarageDocumentDto dto = dtos.get(0);
        assertThat(dto.originalFileName()).isEqualTo("license.pdf");
        assertThat(dto.documentType()).isEqualTo(DocumentType.TRADE_LICENSE);
        // The DTO record has no storageKey accessor, preserving confidentiality
    }
}
