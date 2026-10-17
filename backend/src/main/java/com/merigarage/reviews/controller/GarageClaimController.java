package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageClaimService;
import com.merigarage.reviews.service.dto.GarageClaimDto;
import com.merigarage.reviews.service.dto.SubmitClaimRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
public class GarageClaimController {

    private final GarageClaimService claimService;
    private final SecurityContextService securityContextService;

    public GarageClaimController(GarageClaimService claimService,
                                 SecurityContextService securityContextService) {
        this.claimService = claimService;
        this.securityContextService = securityContextService;
    }

    @PostMapping(value = "/api/garages/{id}/claims", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<GarageClaimDto> submitClaimJson(
            @PathVariable Long id,
            @Valid @RequestBody SubmitClaimRequest request
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        GarageClaim claim = claimService.submitClaimWithDocuments(
                id,
                request.claimMessage(),
                request.claimantName(),
                request.claimantPhone(),
                request.claimantEmail(),
                request.businessRegNumber(),
                null,
                null,
                currentUser
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(GarageClaimDto.fromEntity(claim));
    }

    @PostMapping(value = "/api/garages/{id}/claims", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GarageClaimDto> submitClaimMultipart(
            @PathVariable Long id,
            @RequestParam("claimMessage") String claimMessage,
            @RequestParam(value = "claimantName", required = false) String claimantName,
            @RequestParam(value = "claimantPhone", required = false) String claimantPhone,
            @RequestParam(value = "claimantEmail", required = false) String claimantEmail,
            @RequestParam(value = "businessRegNumber", required = false) String businessRegNumber,
            @RequestParam(value = "documentTypes", required = false) List<DocumentType> documentTypes,
            @RequestParam(value = "documents", required = false) List<MultipartFile> documents
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        GarageClaim claim = claimService.submitClaimWithDocuments(
                id,
                claimMessage,
                claimantName,
                claimantPhone,
                claimantEmail,
                businessRegNumber,
                documents,
                documentTypes,
                currentUser
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(GarageClaimDto.fromEntity(claim));
    }

    @GetMapping("/api/claims/my-claims")
    public ResponseEntity<List<GarageClaimDto>> getMyClaims() {
        Long currentUserId = securityContextService.getRequiredCurrentUserId();
        List<GarageClaimDto> myClaims = claimService.getClaimsByUser(currentUserId).stream()
                .map(GarageClaimDto::fromEntity)
                .toList();
        return ResponseEntity.ok(myClaims);
    }

    @GetMapping("/api/claims/{claimId}/documents/{docId}/download")
    public ResponseEntity<Resource> downloadClaimDocument(
            @PathVariable Long claimId,
            @PathVariable Long docId
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        Resource resource = claimService.loadClaimDocumentResource(claimId, docId, currentUser);

        GarageClaim claim = claimService.getClaimById(claimId);
        GarageDocument targetDoc = claim.getDocuments().stream()
                .filter(d -> d.getId().equals(docId))
                .findFirst()
                .orElse(null);

        String filename = targetDoc != null ? targetDoc.getOriginalFileName() : "claim-document-" + docId;
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (targetDoc != null && targetDoc.getContentType() != null) {
            try {
                mediaType = MediaType.parseMediaType(targetDoc.getContentType());
            } catch (Exception ignored) {
            }
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }
}
