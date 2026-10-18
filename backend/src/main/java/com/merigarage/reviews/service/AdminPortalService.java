package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.*;
import com.merigarage.reviews.domain.enums.*;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.repository.*;
import com.merigarage.reviews.service.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminPortalService {

    private static final Logger log = LoggerFactory.getLogger(AdminPortalService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserAdminPermissionRepository userAdminPermissionRepository;
    private final GarageRepository garageRepository;
    private final GarageQuoteRequestRepository quoteRequestRepository;
    private final GarageClaimRepository claimRepository;
    private final LeadEventRepository leadEventRepository;
    private final ServiceRepository serviceRepository;
    private final GarageServiceRepository garageServiceRepository;
    private final GarageApprovalAuditRepository approvalAuditRepository;
    private final GarageDocumentRepository documentRepository;
    private final GarageQuoteService quoteService;
    private final AuditTrailService auditTrailService;
    private final UserAuthorizationService userAuthorizationService;
    private final AdminAuditLogRepository auditLogRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewReportRepository reviewReportRepository;
    private final ReviewReportService reviewReportService;
    private final GaragePhotoRepository photoRepository;

    public AdminPortalService(UserRepository userRepository,
                              RoleRepository roleRepository,
                              UserRoleRepository userRoleRepository,
                              UserAdminPermissionRepository userAdminPermissionRepository,
                              GarageRepository garageRepository,
                              GarageQuoteRequestRepository quoteRequestRepository,
                              GarageClaimRepository claimRepository,
                              LeadEventRepository leadEventRepository,
                              ServiceRepository serviceRepository,
                              GarageServiceRepository garageServiceRepository,
                              GarageApprovalAuditRepository approvalAuditRepository,
                              GarageDocumentRepository documentRepository,
                              GarageQuoteService quoteService,
                              AuditTrailService auditTrailService,
                              UserAuthorizationService userAuthorizationService,
                              AdminAuditLogRepository auditLogRepository,
                              ReviewRepository reviewRepository,
                              ReviewReportRepository reviewReportRepository,
                              ReviewReportService reviewReportService,
                              GaragePhotoRepository photoRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.userAdminPermissionRepository = userAdminPermissionRepository;
        this.garageRepository = garageRepository;
        this.quoteRequestRepository = quoteRequestRepository;
        this.claimRepository = claimRepository;
        this.leadEventRepository = leadEventRepository;
        this.serviceRepository = serviceRepository;
        this.garageServiceRepository = garageServiceRepository;
        this.approvalAuditRepository = approvalAuditRepository;
        this.documentRepository = documentRepository;
        this.quoteService = quoteService;
        this.auditTrailService = auditTrailService;
        this.userAuthorizationService = userAuthorizationService;
        this.auditLogRepository = auditLogRepository;
        this.reviewRepository = reviewRepository;
        this.reviewReportRepository = reviewReportRepository;
        this.reviewReportService = reviewReportService;
        this.photoRepository = photoRepository;
    }

    @Transactional(readOnly = true)
    public AdminOverviewMetricsDto getOverviewMetrics() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Users metrics
        long totalUsers = userRepository.count();
        Role userRole = roleRepository.findByName(RoleName.ROLE_USER).orElse(null);
        Role ownerRole = roleRepository.findByName(RoleName.ROLE_GARAGE_OWNER).orElse(null);
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElse(null);

        long customerAccounts = userRole != null ? userRoleRepository.countByRoleId(userRole.getId()) : 0;
        long garageOwnerAccounts = ownerRole != null ? userRoleRepository.countByRoleId(ownerRole.getId()) : 0;
        long adminAccounts = adminRole != null ? userRoleRepository.countByRoleId(adminRole.getId()) : 0;

        long reg24h = userRepository.countByCreatedAtAfter(now.minusHours(24));
        long reg7d = userRepository.countByCreatedAtAfter(now.minusDays(7));
        long reg30d = userRepository.countByCreatedAtAfter(now.minusDays(30));

        // 2. Garages metrics
        long totalGarages = garageRepository.count();
        long activeGarages = garageRepository.countByApprovalStatus(GarageApprovalStatus.APPROVED);
        long pendingGarages = garageRepository.countByApprovalStatus(GarageApprovalStatus.PENDING);
        long suspendedGarages = garageRepository.countByApprovalStatus(GarageApprovalStatus.SUSPENDED);
        long rejectedGarages = garageRepository.countByApprovalStatus(GarageApprovalStatus.REJECTED);
        long verifiedGarages = garageRepository.countByIsVerifiedTrue();
        long claimedGarages = garageRepository.countByOwnerIsNotNull();
        // Phase 7: Explicitly calculate published non-deleted reviews across all garages
        long totalReviews = reviewRepository.countByStatusAndIsDeletedFalse(ReviewStatus.PUBLISHED);
        long totalSubmittedReviews = reviewRepository.countByIsDeletedFalse();
        long pendingReviewReports = reviewReportRepository.countByStatus(ReviewReportStatus.PENDING);

        // 3. Leads metrics
        long totalLeads = leadEventRepository.count();
        long searchSubmissions = leadEventRepository.countByEventType(LeadEventType.HOMEPAGE_SEARCH_SUBMITTED);

        // 4. Quotes by status
        Map<String, Long> quotesByStatus = new LinkedHashMap<>();
        for (QuoteRequestStatus status : QuoteRequestStatus.values()) {
            quotesByStatus.put(status.name(), quoteRequestRepository.countByStatus(status));
        }

        // 5. Claims by status
        Map<String, Long> claimsByStatus = new LinkedHashMap<>();
        for (ClaimStatus status : ClaimStatus.values()) {
            claimsByStatus.put(status.name(), claimRepository.countByClaimStatus(status));
        }

        // 6. Recent Registrations (top 5)
        Pageable top5 = PageRequest.of(0, 5, org.springframework.data.domain.Sort.by("createdAt").descending());
        List<User> recentUserList = userRepository.findAll(top5).getContent();
        List<AdminUserSummaryDto> recentRegistrations = buildUserSummaries(recentUserList);

        // 7. Recent Leads (top 5)
        List<LeadEventSummaryDto> recentLeads = leadEventRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(LeadEventSummaryDto::fromEntity)
                .toList();

        // 8. Recent Quotes (top 5)
        List<AdminQuoteSummaryDto> recentQuotes = quoteRequestRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(AdminQuoteSummaryDto::fromEntity)
                .toList();

        // 9. Service catalogue usage
        List<com.merigarage.reviews.domain.Service> services = serviceRepository.findAllByOrderByDisplayOrderAscIdAsc();
        List<ServiceUsageDto> serviceUsage = services.stream()
                .map(s -> new ServiceUsageDto(
                        s.getId(),
                        s.getName(),
                        s.getSlug(),
                        s.getCategory().name(),
                        garageServiceRepository.countByServiceIdAndIsAvailableTrue(s.getId())
                ))
                .toList();

        return new AdminOverviewMetricsDto(
                totalUsers,
                customerAccounts,
                garageOwnerAccounts,
                adminAccounts,
                reg24h,
                reg7d,
                reg30d,
                totalGarages,
                activeGarages,
                pendingGarages,
                suspendedGarages,
                rejectedGarages,
                verifiedGarages,
                claimedGarages,
                totalReviews,
                totalSubmittedReviews,
                pendingReviewReports,
                totalLeads,
                searchSubmissions,
                quotesByStatus,
                claimsByStatus,
                recentRegistrations,
                recentLeads,
                recentQuotes,
                serviceUsage
        );
    }

    @Transactional(readOnly = true)
    public Page<ReviewReportDto> searchReviewReports(ReviewReportStatus status, String search, Pageable pageable) {
        return reviewReportService.searchReports(status, search, pageable);
    }

    @Transactional(readOnly = true)
    public ReviewReportDto getReviewReportById(Long id) {
        return reviewReportService.getReportById(id);
    }

    public ReviewReportDto moderateReviewReport(Long id, ModerateReviewReportRequest request, User adminUser) {
        return reviewReportService.moderateReport(id, request, adminUser);
    }

    @Transactional(readOnly = true)
    public Page<AdminUserSummaryDto> searchUsers(String search,
                                                String roleStr,
                                                UserStatus status,
                                                LocalDateTime fromDt,
                                                LocalDateTime toDt,
                                                Pageable pageable) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<User> userPage = userRepository.searchUsers(cleanSearch, status, fromDt, toDt, pageable);

        List<AdminUserSummaryDto> dtos = buildUserSummaries(userPage.getContent());

        if (roleStr != null && !roleStr.isBlank()) {
            final String targetRole = roleStr.trim().toUpperCase();
            List<AdminUserSummaryDto> filtered = dtos.stream()
                    .filter(u -> u.roles().stream().anyMatch(r -> r.equalsIgnoreCase(targetRole) || r.equalsIgnoreCase("ROLE_" + targetRole)))
                    .toList();
            return new PageImpl<>(filtered, pageable, filtered.size());
        }

        return new PageImpl<>(dtos, pageable, userPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public AdminUserDetailDto getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        List<UserRole> userRoles = userRoleRepository.findByUserId(userId);
        List<String> roleNames = userRoles.stream().map(ur -> ur.getRole().getName().name()).toList();

        List<UserAdminPermission> permissions = userAdminPermissionRepository.findByUserId(userId);
        List<String> permCodes = permissions.stream().map(p -> p.getPermission().getCode().name()).toList();

        List<GarageSummaryDto> linkedGarages = garageRepository.findByOwnerOrCreator(userId).stream()
                .map(g -> GarageSummaryDto.fromEntity(g, null))
                .toList();

        List<QuoteRequestDto> quoteRequests = quoteRequestRepository.findByCustomerUserId(userId).stream()
                .map(QuoteRequestDto::fromEntity)
                .toList();

        List<GarageClaimDto> claims = claimRepository.findByClaimantUserIdOrderByCreatedAtDesc(userId).stream()
                .map(GarageClaimDto::fromEntity)
                .toList();

        AdminUserSummaryDto summary = AdminUserSummaryDto.fromUser(
                user,
                roleNames,
                permCodes,
                linkedGarages.size(),
                quoteRequests.size()
        );

        return new AdminUserDetailDto(summary, linkedGarages, quoteRequests, claims);
    }

    public AdminUserSummaryDto updateUserStatus(Long userId, UpdateUserStatusRequest request, User callerAdmin) {
        if (callerAdmin != null && callerAdmin.getId().equals(userId)) {
            throw new ForbiddenOperationException("Administrators cannot change their own account status.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        UserStatus oldStatus = user.getStatus();
        log.info("Admin {} ({}) changed User {} status from {} to {}. Reason: {}",
                callerAdmin != null ? callerAdmin.getId() : "system",
                callerAdmin != null ? callerAdmin.getEmail() : "system",
                user.getId(),
                oldStatus,
                request.status(),
                request.reason());

        user.setStatus(request.status());
        User saved = userRepository.save(user);

        auditTrailService.recordAction(
                callerAdmin,
                "USER_STATUS_CHANGE",
                "USER",
                user.getId(),
                "SUCCESS",
                "User " + user.getId() + " (" + user.getEmail() + ") status changed from " + oldStatus + " to " + request.status() +
                        (request.reason() != null && !request.reason().isBlank() ? ". Reason: " + request.reason() : ""),
                "{\"oldStatus\":\"" + oldStatus + "\",\"newStatus\":\"" + request.status() + "\"}"
        );

        return buildUserSummaries(List.of(saved)).get(0);
    }

    @Transactional(readOnly = true)
    public Page<AdminGarageDetailDto> searchGarages(String search,
                                                   GarageApprovalStatus status,
                                                   Boolean verified,
                                                   String city,
                                                   String state,
                                                   Pageable pageable) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String cleanCity = (city != null && !city.isBlank()) ? city.trim() : null;
        String cleanState = (state != null && !state.isBlank()) ? state.trim() : null;

        Page<Garage> garagePage = garageRepository.searchGaragesForAdmin(status, verified, cleanCity, cleanState, cleanSearch, pageable);

        List<AdminGarageDetailDto> dtos = garagePage.getContent().stream()
                .map(this::buildGarageDetailDto)
                .toList();

        return new PageImpl<>(dtos, pageable, garagePage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public AdminGarageDetailDto getGarageDetail(Long garageId) {
        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));
        return buildGarageDetailDto(garage);
    }

    @Transactional(readOnly = true)
    public Page<AdminQuoteSummaryDto> searchQuotes(String search,
                                                  QuoteRequestStatus status,
                                                  LocalDateTime fromDt,
                                                  LocalDateTime toDt,
                                                  Pageable pageable) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<GarageQuoteRequest> page = quoteRequestRepository.searchQuotesForAdmin(cleanSearch, status, fromDt, toDt, pageable);
        List<AdminQuoteSummaryDto> dtos = page.getContent().stream()
                .map(AdminQuoteSummaryDto::fromEntity)
                .toList();
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public QuoteRequestDto getQuoteDetail(Long quoteId) {
        GarageQuoteRequest quote = quoteRequestRepository.findByIdWithDetails(quoteId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote request not found with id: " + quoteId));
        return QuoteRequestDto.fromEntity(quote);
    }

    public QuoteRequestDto updateQuoteStatus(Long quoteId, AdminQuoteStatusUpdateRequest request, User callerAdmin) {
        GarageQuoteRequest quote = quoteRequestRepository.findByIdWithDetails(quoteId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote request not found with id: " + quoteId));

        QuoteRequestStatus oldStatus = quote.getStatus();
        log.info("Admin {} ({}) intervened on Quote {} status from {} to {}. Reason: {}",
                callerAdmin != null ? callerAdmin.getId() : "system",
                callerAdmin != null ? callerAdmin.getEmail() : "system",
                quote.getId(),
                oldStatus,
                request.status(),
                request.reason());

        quote.setStatus(request.status());
        quote.setOwnerNotes((quote.getOwnerNotes() != null ? quote.getOwnerNotes() + "\n" : "") +
                "[Admin Action by " + (callerAdmin != null ? callerAdmin.getFullName() : "Admin") + "]: " + request.reason());

        GarageQuoteRequest saved = quoteRequestRepository.save(quote);

        auditTrailService.recordAction(
                callerAdmin,
                "QUOTE_STATUS_UPDATE",
                "QUOTE_REQUEST",
                quote.getId(),
                "SUCCESS",
                "Quote " + quote.getReferenceNumber() + " status changed from " + oldStatus + " to " + request.status() +
                        (request.reason() != null && !request.reason().isBlank() ? ". Reason: " + request.reason() : ""),
                "{\"referenceNumber\":\"" + quote.getReferenceNumber() + "\",\"oldStatus\":\"" + oldStatus + "\",\"newStatus\":\"" + request.status() + "\"}"
        );

        return QuoteRequestDto.fromEntity(saved);
    }

    @Transactional
    public String exportCsv(String type, User callerAdmin) {
        log.info("Admin {} ({}) requested CSV data export of type '{}'",
                callerAdmin != null ? callerAdmin.getId() : "admin",
                callerAdmin != null ? callerAdmin.getEmail() : "admin@merigarage.com",
                type);

        StringBuilder sb = new StringBuilder();

        switch (type.toLowerCase()) {
            case "users" -> {
                sb.append("User ID,Full Name,Email,Phone Number,Status,Roles,Registration Source,Consent Status,Created At\n");
                List<User> users = userRepository.findAll(org.springframework.data.domain.Sort.by("id").ascending());
                List<AdminUserSummaryDto> summaries = buildUserSummaries(users);
                for (AdminUserSummaryDto u : summaries) {
                    sb.append(u.id()).append(",")
                            .append(csvEscape(u.fullName())).append(",")
                            .append(csvEscape(u.email())).append(",")
                            .append(csvEscape(u.phoneNumber() != null ? u.phoneNumber() : "")).append(",")
                            .append(u.status()).append(",")
                            .append(csvEscape(String.join(";", u.roles()))).append(",")
                            .append(csvEscape(u.registrationSource() != null ? u.registrationSource() : "")).append(",")
                            .append(csvEscape(u.consentStatus() != null ? u.consentStatus() : "")).append(",")
                            .append(u.createdAt()).append("\n");
                }
            }
            case "garages" -> {
                sb.append("Garage ID,Name,City,State,Address,Phone,Approval Status,Verified,Owner Email,Created At\n");
                List<Garage> garages = garageRepository.findAll(org.springframework.data.domain.Sort.by("id").ascending());
                for (Garage g : garages) {
                    sb.append(g.getId()).append(",")
                            .append(csvEscape(g.getName())).append(",")
                            .append(csvEscape(g.getCity())).append(",")
                            .append(csvEscape(g.getState())).append(",")
                            .append(csvEscape(g.getAddressLine1())).append(",")
                            .append(csvEscape(g.getPhoneNumber())).append(",")
                            .append(g.getApprovalStatus()).append(",")
                            .append(g.getIsVerified()).append(",")
                            .append(csvEscape(g.getOwner() != null ? g.getOwner().getEmail() : "")).append(",")
                            .append(g.getCreatedAt()).append("\n");
                }
            }
            case "leads" -> {
                sb.append("Event ID,Event Type,Session ID,City,State,Vehicle Make,Vehicle Model,Service Slug,Lead Source,Created At\n");
                List<LeadEvent> events = leadEventRepository.findAll(org.springframework.data.domain.Sort.by("id").descending());
                for (LeadEvent e : events) {
                    sb.append(e.getEventId()).append(",")
                            .append(e.getEventType()).append(",")
                            .append(csvEscape(e.getSessionId())).append(",")
                            .append(csvEscape(e.getCity() != null ? e.getCity() : "")).append(",")
                            .append(csvEscape(e.getState() != null ? e.getState() : "")).append(",")
                            .append(csvEscape(e.getVehicleMake() != null ? e.getVehicleMake() : "")).append(",")
                            .append(csvEscape(e.getVehicleModel() != null ? e.getVehicleModel() : "")).append(",")
                            .append(csvEscape(e.getServiceSlug() != null ? e.getServiceSlug() : "")).append(",")
                            .append(csvEscape(e.getSource() != null ? e.getSource() : "")).append(",")
                            .append(e.getCreatedAt()).append("\n");
                }
            }
            case "quotes" -> {
                sb.append("Reference Number,Garage Name,Customer Name,Customer Email,Contact Phone,Vehicle,Services,Estimated Min,Proposed Quote,Status,Created At\n");
                List<GarageQuoteRequest> quotes = quoteRequestRepository.findAll(org.springframework.data.domain.Sort.by("id").descending());
                for (GarageQuoteRequest q : quotes) {
                    String vehicle = (q.getVehicleMake() != null ? q.getVehicleMake() : "") + " " +
                            (q.getVehicleModel() != null ? q.getVehicleModel() : "");
                    String services = q.getServices() != null
                            ? q.getServices().stream().map(com.merigarage.reviews.domain.Service::getName).collect(Collectors.joining(";"))
                            : "";
                    sb.append(csvEscape(q.getReferenceNumber())).append(",")
                            .append(csvEscape(q.getGarage() != null ? q.getGarage().getName() : "")).append(",")
                            .append(csvEscape(q.getCustomerUser() != null ? q.getCustomerUser().getFullName() : "")).append(",")
                            .append(csvEscape(q.getCustomerUser() != null ? q.getCustomerUser().getEmail() : "")).append(",")
                            .append(csvEscape(q.getContactPhone() != null ? q.getContactPhone() : "")).append(",")
                            .append(csvEscape(vehicle.trim())).append(",")
                            .append(csvEscape(services)).append(",")
                            .append(q.getEstimatedMinPrice() != null ? q.getEstimatedMinPrice() : "").append(",")
                            .append(q.getProposedQuoteAmount() != null ? q.getProposedQuoteAmount() : "").append(",")
                            .append(q.getStatus()).append(",")
                            .append(q.getCreatedAt()).append("\n");
                }
            }
            default -> throw new InvalidOperationException("Unsupported export dataset type: " + type);
        }

        auditTrailService.recordAction(
                callerAdmin,
                "DATA_EXPORT",
                "EXPORT_" + type.toUpperCase(),
                null,
                "SUCCESS",
                "Exported " + type + " dataset as CSV",
                "{\"dataset\":\"" + type.toLowerCase() + "\"}"
        );

        return sb.toString();
    }

    public void manageUserRole(Long userId, ManageRoleRequest request, User callerAdmin) {
        if ("REVOKE".equalsIgnoreCase(request.action())) {
            userAuthorizationService.revokeRole(userId, request.role(), callerAdmin);
        } else {
            userAuthorizationService.grantRole(userId, request.role(), callerAdmin);
        }
    }

    public void switchPrimaryRole(Long userId, SwitchPrimaryRoleRequest request, User callerAdmin) {
        userAuthorizationService.switchPrimaryRole(userId, request.targetRole(), request.reason(), callerAdmin);
    }

    public void manageUserPermission(Long userId, ManagePermissionRequest request, User callerAdmin) {
        if ("REVOKE".equalsIgnoreCase(request.action())) {
            userAuthorizationService.revokeAdminPermission(userId, request.permission(), callerAdmin);
        } else {
            userAuthorizationService.grantAdminPermission(userId, request.permission(), callerAdmin);
        }
    }

    @Transactional(readOnly = true)
    public Page<AdminAuditLogDto> searchAuditLogs(
            String actionType,
            String targetType,
            Long adminUserId,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable) {
        String cleanAction = (actionType != null && !actionType.isBlank()) ? actionType.trim() : null;
        String cleanTarget = (targetType != null && !targetType.isBlank()) ? targetType.trim() : null;
        Page<AdminAuditLog> page = auditLogRepository.searchLogs(cleanAction, cleanTarget, adminUserId, fromDate, toDate, pageable);
        return page.map(AdminAuditLogDto::fromEntity);
    }

    private List<AdminUserSummaryDto> buildUserSummaries(List<User> users) {
        if (users.isEmpty()) return Collections.emptyList();

        List<Long> userIds = users.stream().map(User::getId).toList();
        List<UserRole> allRoles = userRoleRepository.findByUserIdIn(userIds);
        List<UserAdminPermission> allPerms = userAdminPermissionRepository.findByUserIdIn(userIds);

        Map<Long, List<String>> rolesByUser = allRoles.stream()
                .collect(Collectors.groupingBy(
                        ur -> ur.getUser().getId(),
                        Collectors.mapping(ur -> ur.getRole().getName().name(), Collectors.toList())
                ));

        Map<Long, List<String>> permsByUser = allPerms.stream()
                .collect(Collectors.groupingBy(
                        uap -> uap.getUser().getId(),
                        Collectors.mapping(uap -> uap.getPermission().getCode().name(), Collectors.toList())
                ));

        return users.stream().map(u -> {
            List<String> roles = rolesByUser.getOrDefault(u.getId(), Collections.emptyList());
            List<String> perms = permsByUser.getOrDefault(u.getId(), Collections.emptyList());
            int linkedGarages = garageRepository.findByOwnerId(u.getId()).size();
            int quotesCount = quoteRequestRepository.countByCustomerUserId(u.getId());
            return AdminUserSummaryDto.fromUser(u, roles, perms, linkedGarages, quotesCount);
        }).toList();
    }

    private AdminGarageDetailDto buildGarageDetailDto(Garage g) {
        List<String> services = garageServiceRepository.findByGarageId(g.getId()).stream()
                .map(gs -> gs.getService().getName())
                .toList();

        List<GarageApprovalAuditDto> audits = approvalAuditRepository.findByGarageIdOrderByCreatedAtDesc(g.getId()).stream()
                .map(GarageApprovalAuditDto::fromEntity)
                .toList();

        int docsCount = documentRepository.findByGarageId(g.getId()).size();

        Long coverPhotoId = photoRepository.findByGarageIdAndIsCoverTrueAndIsDeletedFalse(g.getId())
                .map(GaragePhoto::getId)
                .orElseGet(() -> photoRepository.findByGarageIdAndIsDeletedFalseOrderByDisplayOrderAsc(g.getId()).stream()
                        .findFirst()
                        .map(GaragePhoto::getId)
                        .orElse(null));

        return AdminGarageDetailDto.fromEntity(g, services, docsCount, audits, coverPhotoId);
    }

    private String csvEscape(String text) {
        if (text == null) return "\"\"";
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }
}
