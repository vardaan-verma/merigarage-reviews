package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageClaimService;
import com.merigarage.reviews.service.dto.ClaimDecisionRequest;
import com.merigarage.reviews.service.dto.DocumentReviewRequest;
import com.merigarage.reviews.service.dto.GarageClaimDto;
import com.merigarage.reviews.service.dto.GarageDocumentDto;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/claims")
@PreAuthorize("hasAuthority('CLAIM_MANAGEMENT')")
public class AdminClaimController {

    private final GarageClaimService claimService;
    private final SecurityContextService securityContextService;

    public AdminClaimController(GarageClaimService claimService,
                                SecurityContextService securityContextService) {
        this.claimService = claimService;
        this.securityContextService = securityContextService;
    }

    @GetMapping
    public ResponseEntity<List<GarageClaimDto>> getPendingClaims() {
        securityContextService.requireAdminPermission(AdminPermissionCode.CLAIM_MANAGEMENT);

        List<GarageClaimDto> claims = claimService.getPendingClaimsForAdmin().stream()
                .map(GarageClaimDto::fromEntity)
                .toList();
        return ResponseEntity.ok(claims);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GarageClaimDto> getClaimById(@PathVariable Long id) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CLAIM_MANAGEMENT);

        GarageClaim claim = claimService.getClaimById(id);
        return ResponseEntity.ok(GarageClaimDto.fromEntity(claim));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<GarageClaimDto> approveClaim(
            @PathVariable Long id,
            @RequestBody(required = false) ClaimDecisionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CLAIM_MANAGEMENT);
        User adminUser = securityContextService.getRequiredCurrentUser();

        String notes = request != null ? request.decisionNotes() : null;
        GarageClaim approved = claimService.approveClaim(id, adminUser, notes);
        return ResponseEntity.ok(GarageClaimDto.fromEntity(approved));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<GarageClaimDto> rejectClaim(
            @PathVariable Long id,
            @Valid @RequestBody ClaimDecisionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CLAIM_MANAGEMENT);
        User adminUser = securityContextService.getRequiredCurrentUser();

        GarageClaim rejected = claimService.rejectClaim(id, adminUser, request.decisionNotes());
        return ResponseEntity.ok(GarageClaimDto.fromEntity(rejected));
    }

    @PostMapping("/{id}/request-resubmission")
    public ResponseEntity<GarageClaimDto> requestResubmission(
            @PathVariable Long id,
            @Valid @RequestBody ClaimDecisionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CLAIM_MANAGEMENT);
        User adminUser = securityContextService.getRequiredCurrentUser();

        GarageClaim updated = claimService.requestResubmission(id, adminUser, request.decisionNotes());
        return ResponseEntity.ok(GarageClaimDto.fromEntity(updated));
    }

    @PostMapping("/{claimId}/documents/{docId}/review")
    public ResponseEntity<GarageDocumentDto> reviewClaimDocument(
            @PathVariable Long claimId,
            @PathVariable Long docId,
            @Valid @RequestBody DocumentReviewRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CLAIM_MANAGEMENT);
        User adminUser = securityContextService.getRequiredCurrentUser();

        GarageDocument doc = claimService.reviewClaimDocument(
                claimId,
                docId,
                request.status(),
                request.rejectionReason(),
                adminUser
        );
        return ResponseEntity.ok(GarageDocumentDto.fromEntity(doc));
    }

    @GetMapping("/{claimId}/documents/{docId}/download")
    public ResponseEntity<Resource> downloadClaimDocument(
            @PathVariable Long claimId,
            @PathVariable Long docId
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CLAIM_MANAGEMENT);
        User adminUser = securityContextService.getRequiredCurrentUser();

        Resource resource = claimService.loadClaimDocumentResource(claimId, docId, adminUser);
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
