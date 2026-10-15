package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.GaragePhoto;
import com.merigarage.reviews.domain.GarageProfileEdit;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageMediaService;
import com.merigarage.reviews.service.GarageProfileEditService;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.ServiceCatalogueService;
import com.merigarage.reviews.service.dto.*;
import com.merigarage.reviews.service.storage.FileStorageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/garages")
public class GarageManagementController {

    private final GarageService garageService;
    private final GarageProfileEditService profileEditService;
    private final GarageMediaService mediaService;
    private final ServiceCatalogueService serviceCatalogueService;
    private final FileStorageService fileStorageService;
    private final SecurityContextService securityContextService;
    private final com.merigarage.reviews.repository.GarageRepository garageRepository;

    public GarageManagementController(GarageService garageService,
                                      GarageProfileEditService profileEditService,
                                      GarageMediaService mediaService,
                                      ServiceCatalogueService serviceCatalogueService,
                                      FileStorageService fileStorageService,
                                      SecurityContextService securityContextService,
                                      com.merigarage.reviews.repository.GarageRepository garageRepository) {
        this.garageService = garageService;
        this.profileEditService = profileEditService;
        this.mediaService = mediaService;
        this.serviceCatalogueService = serviceCatalogueService;
        this.fileStorageService = fileStorageService;
        this.securityContextService = securityContextService;
        this.garageRepository = garageRepository;
    }

    @GetMapping("/my-garages")
    public ResponseEntity<List<GarageSummaryDto>> getMyGarages() {
        User currentUser = securityContextService.getRequiredCurrentUser();
        List<Garage> owned = garageRepository.findByOwnerId(currentUser.getId());
        List<GarageSummaryDto> dtos = owned.stream()
                .map(g -> GarageSummaryDto.fromEntity(g, null))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/my-garages/{id}")
    public ResponseEntity<GarageDetailDto> getMyGarageById(@PathVariable Long id) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        Garage garage = garageService.getGarageById(id);
        List<GaragePhoto> photos = mediaService.getActivePhotosForGarage(id);
        Long coverPhotoId = photos.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsCover()))
                .findFirst()
                .map(GaragePhoto::getId)
                .orElse(photos.isEmpty() ? null : photos.get(0).getId());

        List<GaragePhotoDto> photoDtos = photos.stream()
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .map(GaragePhotoDto::fromEntity)
                .toList();

        List<com.merigarage.reviews.domain.GarageService> services = serviceCatalogueService.getServicesForGarage(id);
        List<GarageServiceDto> serviceDtos = services.stream()
                .map(GarageServiceDto::fromEntity)
                .toList();

        return ResponseEntity.ok(GarageDetailDto.fromEntity(garage, coverPhotoId, photoDtos, serviceDtos));
    }

    @PostMapping
    public ResponseEntity<GarageSummaryDto> createGarageListing(@Valid @RequestBody CreateGarageRequest request) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        Garage created = garageService.createGarage(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(GarageSummaryDto.fromEntity(created, null));
    }

    @PostMapping("/{id}/edits")
    public ResponseEntity<GarageProfileEditDto> submitProfileEdit(
            @PathVariable Long id,
            @Valid @RequestBody ProfileEditRequest request
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        GarageProfileEdit proposal = profileEditService.submitProfileEdit(id, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(GarageProfileEditDto.fromEntity(proposal));
    }

    @GetMapping("/{id}/edits")
    public ResponseEntity<List<GarageProfileEditDto>> getProfileEdits(@PathVariable Long id) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        List<GarageProfileEditDto> edits = profileEditService.getEditsForGarage(id).stream()
                .map(GarageProfileEditDto::fromEntity)
                .toList();
        return ResponseEntity.ok(edits);
    }

    @PostMapping("/{id}/services")
    public ResponseEntity<GarageServiceDto> associateService(
            @PathVariable Long id,
            @Valid @RequestBody AssociateGarageServiceRequest request
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        com.merigarage.reviews.domain.GarageService gs = serviceCatalogueService.associateServiceWithGarage(
                id,
                request.serviceId(),
                request.startingPrice(),
                request.isAvailable()
        );
        return ResponseEntity.ok(GarageServiceDto.fromEntity(gs));
    }

    @DeleteMapping("/{id}/services/{serviceId}")
    public ResponseEntity<Void> disassociateService(
            @PathVariable Long id,
            @PathVariable Integer serviceId
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        serviceCatalogueService.disassociateServiceFromGarage(id, serviceId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GaragePhotoDto> uploadPhoto(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "isCover", required = false) Boolean isCover,
            @RequestParam(value = "displayOrder", required = false) Byte displayOrder
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        Garage garage = garageService.getGarageById(id);
        boolean isOwner = garage.getOwner() != null && garage.getOwner().getId().equals(currentUser.getId());
        boolean isCreatorDuringListing = garage.getOwner() == null && garage.getCreatedBy() != null && garage.getCreatedBy().getId().equals(currentUser.getId());
        if (!isOwner && !isCreatorDuringListing) {
            throw new ForbiddenOperationException("Only the authorized garage owner can perform this operation.");
        }

        String storageKey = fileStorageService.storePhoto(file, id);
        PhotoUploadRequest uploadRequest = new PhotoUploadRequest(
                storageKey,
                file.getContentType(),
                file.getSize(),
                caption,
                displayOrder,
                isCover
        );

        GaragePhoto photo;
        try {
            photo = mediaService.addPhoto(id, uploadRequest, currentUser);
        } catch (Exception ex) {
            fileStorageService.delete(storageKey);
            throw ex;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(GaragePhotoDto.fromEntity(photo));
    }

    @PutMapping("/{id}/photos/{photoId}/cover")
    public ResponseEntity<Void> setCoverPhoto(
            @PathVariable Long id,
            @PathVariable Long photoId
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        mediaService.setCoverPhoto(id, photoId, currentUser);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(
            @PathVariable Long id,
            @PathVariable Long photoId
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        mediaService.deletePhoto(id, photoId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GarageDocumentDto> uploadDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") DocumentType documentType
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        String storageKey = fileStorageService.storeDocument(file, id);
        DocumentUploadRequest docRequest = new DocumentUploadRequest(
                documentType,
                storageKey,
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "document",
                file.getContentType(),
                file.getSize()
        );

        GarageDocument doc = mediaService.uploadDocument(id, docRequest, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(GarageDocumentDto.fromEntity(doc));
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<List<GarageDocumentDto>> getDocuments(@PathVariable Long id) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        verifyGarageOwnership(id, currentUser);

        List<GarageDocumentDto> docs = mediaService.getDocumentsForGarage(id).stream()
                .map(GarageDocumentDto::fromEntity)
                .toList();
        return ResponseEntity.ok(docs);
    }

    private void verifyGarageOwnership(Long garageId, User user) {
        Garage garage = garageService.getGarageById(garageId);
        boolean isOwner = garage.getOwner() != null && garage.getOwner().getId().equals(user.getId());
        if (!isOwner) {
            throw new ForbiddenOperationException("Only the authorized garage owner can perform this operation.");
        }
    }
}
