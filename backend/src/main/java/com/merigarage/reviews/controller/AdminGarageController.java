package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageProfileEdit;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageProfileEditService;
import com.merigarage.reviews.service.GarageService;
import com.merigarage.reviews.service.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/garages")
@PreAuthorize("hasAuthority('GARAGE_APPROVAL')")
public class AdminGarageController {

    private final GarageService garageService;
    private final GarageProfileEditService profileEditService;
    private final SecurityContextService securityContextService;

    public AdminGarageController(GarageService garageService,
                                 GarageProfileEditService profileEditService,
                                 SecurityContextService securityContextService) {
        this.garageService = garageService;
        this.profileEditService = profileEditService;
        this.securityContextService = securityContextService;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<GarageSummaryDto>> getPendingGarages() {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);

        List<GarageSummaryDto> pending = garageService.findPendingGaragesForAdmin().stream()
                .map(g -> GarageSummaryDto.fromEntity(g, null))
                .toList();
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<GarageSummaryDto> approveGarage(
            @PathVariable Long id,
            @RequestBody(required = false) AdminDecisionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);
        User adminUser = securityContextService.getRequiredCurrentUser();

        String notes = request != null ? request.notes() : null;
        Garage approved = garageService.approveGarage(id, adminUser, notes);
        return ResponseEntity.ok(GarageSummaryDto.fromEntity(approved, null));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<GarageSummaryDto> rejectGarage(
            @PathVariable Long id,
            @Valid @RequestBody AdminDecisionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);
        User adminUser = securityContextService.getRequiredCurrentUser();

        Garage rejected = garageService.rejectGarage(id, adminUser, request.notes());
        return ResponseEntity.ok(GarageSummaryDto.fromEntity(rejected, null));
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<GarageSummaryDto> suspendGarage(
            @PathVariable Long id,
            @Valid @RequestBody AdminDecisionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);
        User adminUser = securityContextService.getRequiredCurrentUser();

        Garage suspended = garageService.suspendGarage(id, adminUser, request.notes());
        return ResponseEntity.ok(GarageSummaryDto.fromEntity(suspended, null));
    }

    @PutMapping("/{id}/verified")
    public ResponseEntity<GarageSummaryDto> setVerifiedStatus(
            @PathVariable Long id,
            @RequestBody SetVerifiedRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);
        User adminUser = securityContextService.getRequiredCurrentUser();

        String notes = request != null ? request.notes() : null;
        boolean verified = request != null && request.verified();
        Garage updated = garageService.setVerifiedStatus(id, verified, adminUser, notes);
        return ResponseEntity.ok(GarageSummaryDto.fromEntity(updated, null));
    }

    @GetMapping("/edits/pending")
    public ResponseEntity<List<GarageProfileEditDto>> getPendingProfileEdits() {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);

        List<GarageProfileEditDto> edits = profileEditService.getPendingEditsForAdmin().stream()
                .map(GarageProfileEditDto::fromEntity)
                .toList();
        return ResponseEntity.ok(edits);
    }

    @PostMapping("/edits/{id}/approve")
    public ResponseEntity<GarageProfileEditDto> approveProfileEdit(
            @PathVariable Long id,
            @RequestBody(required = false) AdminDecisionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);
        User adminUser = securityContextService.getRequiredCurrentUser();

        String notes = request != null ? request.notes() : null;
        GarageProfileEdit approved = profileEditService.approveProfileEdit(id, adminUser, notes);
        return ResponseEntity.ok(GarageProfileEditDto.fromEntity(approved));
    }

    @PostMapping("/edits/{id}/reject")
    public ResponseEntity<GarageProfileEditDto> rejectProfileEdit(
            @PathVariable Long id,
            @Valid @RequestBody AdminDecisionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);
        User adminUser = securityContextService.getRequiredCurrentUser();

        GarageProfileEdit rejected = profileEditService.rejectProfileEdit(id, adminUser, request.notes());
        return ResponseEntity.ok(GarageProfileEditDto.fromEntity(rejected));
    }
}
