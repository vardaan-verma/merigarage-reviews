package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageMediaService;
import com.merigarage.reviews.service.dto.DocumentReviewRequest;
import com.merigarage.reviews.service.dto.GarageDocumentDto;
import com.merigarage.reviews.service.storage.FileStorageService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/documents")
@PreAuthorize("hasAuthority('VERIFICATION_REVIEW')")
public class AdminDocumentController {

    private final GarageMediaService mediaService;
    private final FileStorageService fileStorageService;
    private final SecurityContextService securityContextService;

    public AdminDocumentController(GarageMediaService mediaService,
                                   FileStorageService fileStorageService,
                                   SecurityContextService securityContextService) {
        this.mediaService = mediaService;
        this.fileStorageService = fileStorageService;
        this.securityContextService = securityContextService;
    }

    @GetMapping("/garage/{garageId}")
    public ResponseEntity<List<GarageDocumentDto>> getDocumentsForGarage(@PathVariable Long garageId) {
        securityContextService.requireAdminPermission(AdminPermissionCode.VERIFICATION_REVIEW);

        List<GarageDocumentDto> docs = mediaService.getDocumentsForGarage(garageId).stream()
                .map(GarageDocumentDto::fromEntity)
                .toList();
        return ResponseEntity.ok(docs);
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<GarageDocumentDto> reviewDocument(
            @PathVariable Long id,
            @Valid @RequestBody DocumentReviewRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.VERIFICATION_REVIEW);
        User adminUser = securityContextService.getRequiredCurrentUser();

        GarageDocument doc = mediaService.reviewDocument(id, request.status(), request.rejectionReason(), adminUser);
        return ResponseEntity.ok(GarageDocumentDto.fromEntity(doc));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id) {
        securityContextService.requireAdminPermission(AdminPermissionCode.VERIFICATION_REVIEW);

        GarageDocument doc = mediaService.getDocumentById(id);
        Resource resource = fileStorageService.loadAsResource(doc.getStorageKey());

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            mediaType = MediaType.parseMediaType(doc.getContentType());
        } catch (Exception ignored) {
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getOriginalFileName() + "\"")
                .body(resource);
    }
}
