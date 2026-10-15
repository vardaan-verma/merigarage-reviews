package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.GaragePhoto;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.DocumentVerificationStatus;
import com.merigarage.reviews.domain.enums.ModerationStatus;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageDocumentRepository;
import com.merigarage.reviews.repository.GaragePhotoRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.service.dto.DocumentUploadRequest;
import com.merigarage.reviews.service.dto.GarageDocumentDto;
import com.merigarage.reviews.service.dto.PhotoUploadRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class GarageMediaService {

    public static final int MAX_PHOTOS_PER_GARAGE = 7;

    private final GaragePhotoRepository photoRepository;
    private final GarageDocumentRepository documentRepository;
    private final GarageRepository garageRepository;

    public GarageMediaService(GaragePhotoRepository photoRepository,
                              GarageDocumentRepository documentRepository,
                              GarageRepository garageRepository) {
        this.photoRepository = photoRepository;
        this.documentRepository = documentRepository;
        this.garageRepository = garageRepository;
    }

    @Transactional
    public GaragePhoto addPhoto(Long garageId, PhotoUploadRequest request, User authenticatedUser) {
        if (authenticatedUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to upload photos.");
        }
        if (request == null) {
            throw new ValidationException("Photo upload request cannot be null.");
        }

        // Lock the parent garage row to prevent concurrent requests from exceeding photo limits
        Garage garage = garageRepository.findByIdForUpdate(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        long activeCount = photoRepository.countByGarageIdAndIsDeletedFalseAndModerationStatusNot(garageId, ModerationStatus.REJECTED);
        if (activeCount >= MAX_PHOTOS_PER_GARAGE) {
            if (activeCount > MAX_PHOTOS_PER_GARAGE) {
                throw new ValidationException("This garage already has " + activeCount + " photos, which exceeds the limit of " + MAX_PHOTOS_PER_GARAGE + ". Please delete photos before uploading new ones.");
            }
            throw new ValidationException("Maximum limit of " + MAX_PHOTOS_PER_GARAGE + " active photos reached for this garage.");
        }

        boolean willBeCover = Boolean.TRUE.equals(request.isCover()) || activeCount == 0;

        if (willBeCover) {
            // Atomically unset any existing active cover photo and flush before inserting new cover
            Optional<GaragePhoto> currentCover = photoRepository.findByGarageIdAndIsCoverTrueAndIsDeletedFalse(garageId);
            currentCover.ifPresent(oldCover -> {
                oldCover.setIsCover(false);
                photoRepository.saveAndFlush(oldCover);
            });
        }

        GaragePhoto photo = new GaragePhoto();
        photo.setGarage(garage);
        photo.setUploadedBy(authenticatedUser);
        photo.setStorageKey(request.storageKey().trim());
        photo.setContentType(request.contentType().trim());
        photo.setFileSizeBytes(request.fileSizeBytes());
        photo.setCaption(request.caption());
        photo.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : (byte) activeCount);
        photo.setIsCover(willBeCover);
        photo.setModerationStatus(ModerationStatus.APPROVED);
        photo.setIsDeleted(false);

        return photoRepository.save(photo);
    }

    @Transactional
    public void setCoverPhoto(Long garageId, Long photoId, User authenticatedUser) {
        if (authenticatedUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to update cover photo.");
        }

        // Lock parent garage to ensure atomic cover photo switch
        garageRepository.findByIdForUpdate(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        GaragePhoto targetPhoto = photoRepository.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with id: " + photoId));

        if (!targetPhoto.getGarage().getId().equals(garageId)) {
            throw new InvalidOperationException("Photo does not belong to the specified garage.");
        }
        if (targetPhoto.getIsDeleted()) {
            throw new InvalidOperationException("Cannot set deleted photo as cover photo.");
        }

        Optional<GaragePhoto> currentCover = photoRepository.findByGarageIdAndIsCoverTrueAndIsDeletedFalse(garageId);
        currentCover.ifPresent(oldCover -> {
            if (!oldCover.getId().equals(targetPhoto.getId())) {
                oldCover.setIsCover(false);
                photoRepository.saveAndFlush(oldCover);
            }
        });

        targetPhoto.setIsCover(true);
        photoRepository.save(targetPhoto);
    }

    @Transactional
    public void deletePhoto(Long garageId, Long photoId, User authenticatedUser) {
        if (authenticatedUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to delete photo.");
        }

        GaragePhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with id: " + photoId));

        if (!photo.getGarage().getId().equals(garageId)) {
            throw new InvalidOperationException("Photo does not belong to the specified garage.");
        }

        boolean wasCover = Boolean.TRUE.equals(photo.getIsCover());
        photo.setIsDeleted(true);
        photo.setDeletedAt(LocalDateTime.now());
        if (wasCover) {
            photo.setIsCover(false);
        }
        photoRepository.saveAndFlush(photo);

        if (wasCover) {
            List<GaragePhoto> active = photoRepository.findByGarageIdAndIsDeletedFalseOrderByDisplayOrderAsc(garageId);
            if (!active.isEmpty()) {
                GaragePhoto nextCover = active.get(0);
                nextCover.setIsCover(true);
                photoRepository.save(nextCover);
            }
        }
    }

    @Transactional
    public void deletePhoto(Long photoId, User authenticatedUser) {
        GaragePhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with id: " + photoId));
        deletePhoto(photo.getGarage().getId(), photoId, authenticatedUser);
    }

    public List<GaragePhoto> getActivePhotosForGarage(Long garageId) {
        return photoRepository.findByGarageIdAndIsDeletedFalseOrderByDisplayOrderAsc(garageId);
    }

    @Transactional
    public GarageDocument uploadDocument(Long garageId, DocumentUploadRequest request, User authenticatedUser) {
        if (authenticatedUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to upload verification documents.");
        }
        if (request == null) {
            throw new ValidationException("Document upload request cannot be null.");
        }

        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        GarageDocument doc = new GarageDocument();
        doc.setGarage(garage);
        doc.setDocumentType(request.documentType());
        doc.setStorageKey(request.storageKey().trim());
        doc.setOriginalFileName(request.originalFileName().trim());
        doc.setContentType(request.contentType().trim());
        doc.setFileSizeBytes(request.fileSizeBytes());
        doc.setVerificationStatus(DocumentVerificationStatus.PENDING);

        return documentRepository.save(doc);
    }

    @Transactional
    public GarageDocument reviewDocument(Long documentId, DocumentVerificationStatus status, String rejectionReason, User adminUser) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin authorization required to review documents.");
        }

        GarageDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage document not found with id: " + documentId));

        doc.setVerificationStatus(status);
        doc.setReviewedBy(adminUser);
        doc.setReviewedAt(LocalDateTime.now());
        doc.setRejectionReason(rejectionReason);

        return documentRepository.save(doc);
    }

    public GaragePhoto getPhotoById(Long photoId) {
        return photoRepository.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with id: " + photoId));
    }

    public GarageDocument getDocumentById(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage document not found with id: " + documentId));
    }

    public List<GarageDocument> getDocumentsForGarage(Long garageId) {
        return documentRepository.findByGarageId(garageId);
    }

    public List<GarageDocumentDto> getPublicDocumentSummaries(Long garageId) {
        return documentRepository.findByGarageId(garageId).stream()
                .map(GarageDocumentDto::fromEntity)
                .toList();
    }

    public java.util.Map<Long, Long> getCoverPhotoIdsForGarages(List<Long> garageIds) {
        if (garageIds == null || garageIds.isEmpty()) return java.util.Map.of();
        List<GaragePhoto> covers = photoRepository.findCoverPhotosByGarageIds(garageIds);
        java.util.Map<Long, Long> map = new java.util.HashMap<>();
        for (GaragePhoto p : covers) {
            map.put(p.getGarage().getId(), p.getId());
        }
        return map;
    }
}
