package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.domain.enums.QuoteRequestStatus;
import com.merigarage.reviews.domain.enums.UserStatus;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.AdminPortalService;
import com.merigarage.reviews.service.dto.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPortalController {

    private final AdminPortalService adminPortalService;
    private final SecurityContextService securityContextService;

    public AdminPortalController(AdminPortalService adminPortalService,
                                 SecurityContextService securityContextService) {
        this.adminPortalService = adminPortalService;
        this.securityContextService = securityContextService;
    }

    @GetMapping("/overview")
    public ResponseEntity<AdminOverviewMetricsDto> getOverview() {
        AdminOverviewMetricsDto metrics = adminPortalService.getOverviewMetrics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    public ResponseEntity<PagedResponse<AdminUserSummaryDto>> searchUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.USER_MANAGEMENT);
        int validatedPage = Math.max(0, page);
        int validatedSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AdminUserSummaryDto> usersPage = adminPortalService.searchUsers(search, role, status, fromDate, toDate, pageable);
        return ResponseEntity.ok(PagedResponse.fromPage(usersPage));
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    public ResponseEntity<AdminUserDetailDto> getUserDetail(@PathVariable Long id) {
        securityContextService.requireAdminPermission(AdminPermissionCode.USER_MANAGEMENT);
        AdminUserDetailDto detail = adminPortalService.getUserDetail(id);
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/users/{id}/status")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    public ResponseEntity<AdminUserSummaryDto> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.USER_MANAGEMENT);
        User callerAdmin = securityContextService.getRequiredCurrentUser();
        AdminUserSummaryDto updated = adminPortalService.updateUserStatus(id, request, callerAdmin);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/users/{id}/roles")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    public ResponseEntity<AdminUserDetailDto> manageUserRole(
            @PathVariable Long id,
            @Valid @RequestBody ManageRoleRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.USER_MANAGEMENT);
        User callerAdmin = securityContextService.getRequiredCurrentUser();
        adminPortalService.manageUserRole(id, request, callerAdmin);
        return ResponseEntity.ok(adminPortalService.getUserDetail(id));
    }

    @PostMapping("/users/{id}/permissions")
    @PreAuthorize("hasAuthority('USER_MANAGEMENT')")
    public ResponseEntity<AdminUserDetailDto> manageUserPermission(
            @PathVariable Long id,
            @Valid @RequestBody ManagePermissionRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.USER_MANAGEMENT);
        User callerAdmin = securityContextService.getRequiredCurrentUser();
        adminPortalService.manageUserPermission(id, request, callerAdmin);
        return ResponseEntity.ok(adminPortalService.getUserDetail(id));
    }

    @GetMapping("/garages/all")
    @PreAuthorize("hasAuthority('GARAGE_APPROVAL')")
    public ResponseEntity<PagedResponse<AdminGarageDetailDto>> searchGarages(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) GarageApprovalStatus status,
            @RequestParam(required = false) Boolean verified,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);
        int validatedPage = Math.max(0, page);
        int validatedSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AdminGarageDetailDto> garagePage = adminPortalService.searchGarages(search, status, verified, city, state, pageable);
        return ResponseEntity.ok(PagedResponse.fromPage(garagePage));
    }

    @GetMapping("/garages/{id}/details")
    @PreAuthorize("hasAuthority('GARAGE_APPROVAL')")
    public ResponseEntity<AdminGarageDetailDto> getGarageDetail(@PathVariable Long id) {
        securityContextService.requireAdminPermission(AdminPermissionCode.GARAGE_APPROVAL);
        AdminGarageDetailDto detail = adminPortalService.getGarageDetail(id);
        return ResponseEntity.ok(detail);
    }

    @GetMapping("/quotes")
    @PreAuthorize("hasAuthority('QUOTE_OVERSIGHT')")
    public ResponseEntity<PagedResponse<AdminQuoteSummaryDto>> searchQuotes(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) QuoteRequestStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.QUOTE_OVERSIGHT);
        int validatedPage = Math.max(0, page);
        int validatedSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AdminQuoteSummaryDto> quotePage = adminPortalService.searchQuotes(search, status, fromDate, toDate, pageable);
        return ResponseEntity.ok(PagedResponse.fromPage(quotePage));
    }

    @GetMapping("/quotes/{id}")
    @PreAuthorize("hasAuthority('QUOTE_OVERSIGHT')")
    public ResponseEntity<QuoteRequestDto> getQuoteDetail(@PathVariable Long id) {
        securityContextService.requireAdminPermission(AdminPermissionCode.QUOTE_OVERSIGHT);
        QuoteRequestDto detail = adminPortalService.getQuoteDetail(id);
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/quotes/{id}/status")
    @PreAuthorize("hasAuthority('QUOTE_OVERSIGHT')")
    public ResponseEntity<QuoteRequestDto> updateQuoteStatus(
            @PathVariable Long id,
            @Valid @RequestBody AdminQuoteStatusUpdateRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.QUOTE_OVERSIGHT);
        User callerAdmin = securityContextService.getRequiredCurrentUser();
        QuoteRequestDto updated = adminPortalService.updateQuoteStatus(id, request, callerAdmin);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/export/{type}")
    @PreAuthorize("hasAuthority('DATA_EXPORT')")
    public ResponseEntity<String> exportCsv(@PathVariable String type) {
        securityContextService.requireAdminPermission(AdminPermissionCode.DATA_EXPORT);
        User callerAdmin = securityContextService.getCurrentUser().orElse(null);
        String csvData = adminPortalService.exportCsv(type, callerAdmin);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"merigarage_" + type + "_export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<PagedResponse<AdminAuditLogDto>> getAuditLogs(
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long adminUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int validatedPage = Math.max(0, page);
        int validatedSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AdminAuditLogDto> logPage = adminPortalService.searchAuditLogs(actionType, targetType, adminUserId, fromDate, toDate, pageable);
        return ResponseEntity.ok(PagedResponse.fromPage(logPage));
    }
}
