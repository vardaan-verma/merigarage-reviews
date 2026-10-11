package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageClaimService;
import com.merigarage.reviews.service.dto.ClaimDecisionRequest;
import com.merigarage.reviews.service.dto.GarageClaimDto;
import jakarta.validation.Valid;
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
}
