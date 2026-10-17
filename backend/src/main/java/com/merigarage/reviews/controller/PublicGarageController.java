package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GaragePhoto;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.domain.enums.ModerationStatus;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.service.GarageMediaService;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.ServiceCatalogueService;
import com.merigarage.reviews.service.dto.GarageDetailDto;
import com.merigarage.reviews.service.dto.GaragePhotoDto;
import com.merigarage.reviews.service.dto.GarageServiceDto;
import com.merigarage.reviews.service.dto.GarageSummaryDto;
import com.merigarage.reviews.service.dto.PagedResponse;
import com.merigarage.reviews.service.storage.FileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/garages")
public class PublicGarageController {

    private final GarageService garageService;
    private final GarageMediaService mediaService;
    private final ServiceCatalogueService serviceCatalogueService;
    private final FileStorageService fileStorageService;

    public PublicGarageController(GarageService garageService,
                                  GarageMediaService mediaService,
                                  ServiceCatalogueService serviceCatalogueService,
                                  FileStorageService fileStorageService) {
        this.garageService = garageService;
        this.mediaService = mediaService;
        this.serviceCatalogueService = serviceCatalogueService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<GarageSummaryDto>> listApprovedGarages(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Boolean isVerified,
            @RequestParam(required = false) Integer serviceId,
            @RequestParam(required = false) String serviceSlug,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        int validatedPage = Math.max(0, page);
        int validatedSize = Math.min(Math.max(1, size), 50);
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String safeSort = switch (sortBy.toLowerCase()) {
            case "city" -> "city";
            case "createdat" -> "createdAt";
            default -> "name";
        };

        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(direction, safeSort));
        Page<Garage> garagePage = garageService.findPublicApprovedGarages(city, state, isVerified, serviceId, serviceSlug, search, pageable);

        List<Long> garageIds = garagePage.getContent().stream().map(Garage::getId).toList();
        java.util.Map<Long, Long> coverPhotoMap = mediaService.getCoverPhotoIdsForGarages(garageIds);
        java.util.Map<Long, List<String>> servicesMap = serviceCatalogueService.getServiceNamesForGarages(garageIds);

        Page<GarageSummaryDto> summaryPage = garagePage.map(garage -> {
            Long coverPhotoId = coverPhotoMap.get(garage.getId());
            List<String> serviceNames = servicesMap.getOrDefault(garage.getId(), List.of());
            return GarageSummaryDto.fromEntity(garage, coverPhotoId, serviceNames);
        });

        return ResponseEntity.ok(PagedResponse.fromPage(summaryPage));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<GarageDetailDto> getApprovedGarageBySlug(@PathVariable String slug) {
        Garage garage = garageService.getPublicGarageBySlug(slug);

        List<GaragePhoto> photos = mediaService.getActivePhotosForGarage(garage.getId());
        Long coverPhotoId = photos.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsCover()))
                .findFirst()
                .map(GaragePhoto::getId)
                .orElse(photos.isEmpty() ? null : photos.get(0).getId());

        List<GaragePhotoDto> photoDtos = photos.stream()
                .filter(p -> p.getModerationStatus() == ModerationStatus.APPROVED && !Boolean.TRUE.equals(p.getIsDeleted()))
                .map(GaragePhotoDto::fromEntity)
                .toList();

        List<com.merigarage.reviews.domain.GarageService> services = serviceCatalogueService.getServicesForGarage(garage.getId());
        List<GarageServiceDto> serviceDtos = services.stream()
                .filter(gs -> Boolean.TRUE.equals(gs.getIsAvailable()) && Boolean.TRUE.equals(gs.getService().getIsActive()))
                .map(GarageServiceDto::fromEntity)
                .toList();

        return ResponseEntity.ok(GarageDetailDto.fromEntity(garage, coverPhotoId, photoDtos, serviceDtos));
    }

    @GetMapping("/{garageId}/photos/{photoId}")
    public ResponseEntity<Resource> getGaragePhoto(
            @PathVariable Long garageId,
            @PathVariable Long photoId
    ) {
        Garage garage = garageService.getGarageById(garageId);
        if (garage.getApprovalStatus() != GarageApprovalStatus.APPROVED) {
            throw new ResourceNotFoundException("Photo is not publicly accessible.");
        }

        GaragePhoto photo = mediaService.getPhotoById(photoId);
        if (!photo.getGarage().getId().equals(garageId) ||
                Boolean.TRUE.equals(photo.getIsDeleted()) ||
                photo.getModerationStatus() != ModerationStatus.APPROVED) {
            throw new ResourceNotFoundException("Photo not found or not approved.");
        }

        Resource resource = fileStorageService.loadAsResource(photo.getStorageKey());
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            mediaType = MediaType.parseMediaType(photo.getContentType());
        } catch (Exception ignored) {
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(resource);
    }
}
