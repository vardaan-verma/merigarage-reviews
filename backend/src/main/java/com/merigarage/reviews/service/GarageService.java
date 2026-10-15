package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageApprovalAudit;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AuditActionType;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageApprovalAuditRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.service.dto.CreateGarageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@Transactional(readOnly = true)
public class GarageService {

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    private final GarageRepository garageRepository;
    private final GarageApprovalAuditRepository auditRepository;
    private final ServiceCatalogueService serviceCatalogueService;

    public GarageService(GarageRepository garageRepository,
                         GarageApprovalAuditRepository auditRepository,
                         ServiceCatalogueService serviceCatalogueService) {
        this.garageRepository = garageRepository;
        this.auditRepository = auditRepository;
        this.serviceCatalogueService = serviceCatalogueService;
    }

    @Transactional
    public Garage createGarage(CreateGarageRequest request, User authenticatedUser) {
        if (authenticatedUser == null) {
            throw new ForbiddenOperationException("Authenticated user is required to submit a garage listing.");
        }
        if (request == null) {
            throw new ValidationException("Garage creation request cannot be null.");
        }

        String baseSlug = toSlug(request.name());
        String uniqueSlug = generateUniqueSlug(baseSlug);

        Garage garage = new Garage();
        garage.setCreatedBy(authenticatedUser);
        garage.setOwner(null); // Creator is not owner until ownership is verified/claimed
        garage.setName(request.name().trim());
        garage.setSlug(uniqueSlug);
        garage.setDescription(request.description());
        garage.setAddressLine1(request.addressLine1().trim());
        garage.setAddressLine2(request.addressLine2());
        garage.setCity(request.city().trim());
        garage.setState(request.state().trim());
        garage.setPostalCode(request.postalCode().trim());
        garage.setPhoneNumber(request.phoneNumber().trim());
        garage.setEmail(request.email() != null ? request.email().trim().toLowerCase(Locale.ROOT) : null);
        garage.setWebsiteUrl(request.websiteUrl());
        garage.setGoogleMapsUrl(request.googleMapsUrl());

        java.math.BigDecimal lat = request.latitude();
        java.math.BigDecimal lon = request.longitude();
        if ((lat == null || lon == null) && request.googleMapsUrl() != null) {
            java.util.regex.Matcher m1 = java.util.regex.Pattern.compile("@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)").matcher(request.googleMapsUrl());
            if (m1.find()) {
                lat = new java.math.BigDecimal(m1.group(1));
                lon = new java.math.BigDecimal(m1.group(2));
            } else {
                java.util.regex.Matcher m2 = java.util.regex.Pattern.compile("[?&]q=(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)").matcher(request.googleMapsUrl());
                if (m2.find()) {
                    lat = new java.math.BigDecimal(m2.group(1));
                    lon = new java.math.BigDecimal(m2.group(2));
                }
            }
        }
        garage.setLatitude(lat);
        garage.setLongitude(lon);

        // Strictly enforce initial pending status and non-verified status
        garage.setApprovalStatus(GarageApprovalStatus.PENDING);
        garage.setIsVerified(false);

        Garage savedGarage = garageRepository.save(garage);

        if (request.serviceIds() != null && !request.serviceIds().isEmpty()) {
            serviceCatalogueService.associateServicesWithGarage(savedGarage.getId(), request.serviceIds());
        }

        return savedGarage;
    }

    @Transactional
    public Garage approveGarage(Long garageId, User adminUser, String decisionNotes) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        Garage garage = getGarageById(garageId);
        if (garage.getApprovalStatus() == GarageApprovalStatus.APPROVED) {
            throw new InvalidOperationException("Garage is already approved.");
        }

        String prevStatus = garage.getApprovalStatus().name();
        Boolean prevVerified = garage.getIsVerified();

        garage.setApprovalStatus(GarageApprovalStatus.APPROVED);
        Garage savedGarage = garageRepository.save(garage);

        GarageApprovalAudit audit = new GarageApprovalAudit(
                savedGarage,
                AuditActionType.INITIAL_APPROVAL,
                adminUser,
                prevStatus,
                GarageApprovalStatus.APPROVED.name(),
                prevVerified,
                savedGarage.getIsVerified()
        );
        audit.setDecisionNotes(decisionNotes);
        auditRepository.save(audit);

        return savedGarage;
    }

    @Transactional
    public Garage rejectGarage(Long garageId, User adminUser, String rejectionReason) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        Garage garage = getGarageById(garageId);
        String prevStatus = garage.getApprovalStatus().name();
        Boolean prevVerified = garage.getIsVerified();

        garage.setApprovalStatus(GarageApprovalStatus.REJECTED);
        Garage savedGarage = garageRepository.save(garage);

        GarageApprovalAudit audit = new GarageApprovalAudit(
                savedGarage,
                AuditActionType.INITIAL_REJECTION,
                adminUser,
                prevStatus,
                GarageApprovalStatus.REJECTED.name(),
                prevVerified,
                savedGarage.getIsVerified()
        );
        audit.setDecisionNotes(rejectionReason);
        auditRepository.save(audit);

        return savedGarage;
    }

    @Transactional
    public Garage suspendGarage(Long garageId, User adminUser, String suspensionReason) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        Garage garage = getGarageById(garageId);
        String prevStatus = garage.getApprovalStatus().name();
        Boolean prevVerified = garage.getIsVerified();

        garage.setApprovalStatus(GarageApprovalStatus.SUSPENDED);
        Garage savedGarage = garageRepository.save(garage);

        GarageApprovalAudit audit = new GarageApprovalAudit(
                savedGarage,
                AuditActionType.SUSPENDED,
                adminUser,
                prevStatus,
                GarageApprovalStatus.SUSPENDED.name(),
                prevVerified,
                savedGarage.getIsVerified()
        );
        audit.setDecisionNotes(suspensionReason);
        auditRepository.save(audit);

        return savedGarage;
    }

    @Transactional
    public Garage setVerifiedStatus(Long garageId, boolean verified, User adminUser, String notes) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        Garage garage = getGarageById(garageId);
        Boolean prevVerified = garage.getIsVerified();
        if (prevVerified == verified) {
            return garage;
        }

        garage.setIsVerified(verified);
        Garage savedGarage = garageRepository.save(garage);

        AuditActionType action = verified ? AuditActionType.VERIFIED_STATUS_GRANTED : AuditActionType.VERIFIED_STATUS_REVOKED;

        GarageApprovalAudit audit = new GarageApprovalAudit(
                savedGarage,
                action,
                adminUser,
                savedGarage.getApprovalStatus().name(),
                savedGarage.getApprovalStatus().name(),
                prevVerified,
                verified
        );
        audit.setDecisionNotes(notes);
        auditRepository.save(audit);

        return savedGarage;
    }

    public Garage getGarageById(Long garageId) {
        return garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));
    }

    public Garage getPublicGarageBySlug(String slug) {
        Optional<Garage> garageOpt = garageRepository.findBySlug(slug);
        if (garageOpt.isEmpty() && slug != null) {
            try {
                Long id = Long.parseLong(slug.trim());
                garageOpt = garageRepository.findById(id);
            } catch (NumberFormatException ignored) {}
        }

        Garage garage = garageOpt
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with slug: " + slug));

        if (garage.getApprovalStatus() != GarageApprovalStatus.APPROVED) {
            throw new ResourceNotFoundException("Garage listing is not publicly visible.");
        }
        return garage;
    }

    public List<Garage> findPublicApprovedGarages() {
        return garageRepository.findByApprovalStatus(GarageApprovalStatus.APPROVED);
    }

    public org.springframework.data.domain.Page<Garage> findPublicApprovedGarages(
            String city,
            Boolean isVerified,
            Integer serviceId,
            String serviceSlug,
            org.springframework.data.domain.Pageable pageable
    ) {
        String trimmedCity = (city != null && !city.isBlank()) ? city.trim() : null;
        String trimmedSlug = (serviceSlug != null && !serviceSlug.isBlank()) ? serviceSlug.trim() : null;
        return garageRepository.findApprovedWithFilters(
                GarageApprovalStatus.APPROVED,
                trimmedCity,
                isVerified,
                serviceId,
                trimmedSlug,
                pageable
        );
    }

    public org.springframework.data.domain.Page<Garage> findPublicApprovedGarages(
            String city,
            Boolean isVerified,
            org.springframework.data.domain.Pageable pageable
    ) {
        return findPublicApprovedGarages(city, isVerified, null, null, pageable);
    }

    public List<Garage> findPublicApprovedGaragesByCity(String city) {
        return garageRepository.findByApprovalStatusAndCity(GarageApprovalStatus.APPROVED, city);
    }

    public List<Garage> findPendingGaragesForAdmin() {
        return garageRepository.findByApprovalStatus(GarageApprovalStatus.PENDING);
    }

    public org.springframework.data.domain.Page<Garage> findPendingGaragesForAdmin(org.springframework.data.domain.Pageable pageable) {
        return garageRepository.findByApprovalStatus(GarageApprovalStatus.PENDING, pageable);
    }

    private String generateUniqueSlug(String baseSlug) {
        String slug = baseSlug;
        int counter = 1;
        while (garageRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter;
            counter++;
        }
        return slug;
    }

    public static String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "garage";
        }
        String nowhitespace = WHITESPACE.matcher(input.trim().toLowerCase(Locale.ROOT)).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("");
        return slug.replaceAll("-+", "-").replaceAll("^-|-$", "");
    }
}
