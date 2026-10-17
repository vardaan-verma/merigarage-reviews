package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.ClaimStatus;
import com.merigarage.reviews.domain.enums.DocumentType;
import com.merigarage.reviews.domain.enums.DocumentVerificationStatus;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.exception.DuplicateResourceException;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageClaimRepository;
import com.merigarage.reviews.repository.GarageDocumentRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import com.merigarage.reviews.service.storage.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class GarageClaimService {

    private static final Logger log = LoggerFactory.getLogger(GarageClaimService.class);

    private static final Set<String> ALLOWED_DOC_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png"
    );

    public static final long MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024L; // 10 MB

    private final GarageClaimRepository claimRepository;
    private final GarageRepository garageRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final GarageDocumentRepository documentRepository;
    private final FileStorageService fileStorageService;
    private final AuditTrailService auditTrailService;

    public GarageClaimService(GarageClaimRepository claimRepository,
                              GarageRepository garageRepository,
                              RoleRepository roleRepository,
                              UserRoleRepository userRoleRepository,
                              GarageDocumentRepository documentRepository,
                              FileStorageService fileStorageService,
                              AuditTrailService auditTrailService) {
        this.claimRepository = claimRepository;
        this.garageRepository = garageRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.documentRepository = documentRepository;
        this.fileStorageService = fileStorageService;
        this.auditTrailService = auditTrailService;
    }

    @Transactional
    public GarageClaim submitClaim(Long garageId, String claimMessage, User claimantUser) {
        return submitClaimWithDocuments(garageId, claimMessage, null, null, null, null, null, null, claimantUser);
    }

    @Transactional
    public GarageClaim submitClaimWithDocuments(Long garageId,
                                               String claimMessage,
                                               String claimantName,
                                               String claimantPhone,
                                               String claimantEmail,
                                               String businessRegNumber,
                                               List<MultipartFile> files,
                                               List<DocumentType> documentTypes,
                                               User claimantUser) {
        if (claimantUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to submit a garage claim.");
        }
        if (claimMessage == null || claimMessage.isBlank()) {
            throw new ValidationException("Claim message and explanation of ownership are required.");
        }

        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        // Prevent claiming a garage that already has an owner
        if (garage.getOwner() != null) {
            throw new InvalidOperationException("Garage already has an assigned owner. Cannot submit claim.");
        }

        // Prevent duplicate simultaneous pending claims by the same user for the same garage
        claimRepository.findByGarageIdAndClaimantUserIdAndClaimStatus(garageId, claimantUser.getId(), ClaimStatus.PENDING)
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("You already have a pending claim for this garage.");
                });

        // Validate attached documents if provided
        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) continue;
                if (file.getSize() > MAX_DOC_SIZE_BYTES) {
                    throw new ValidationException(String.format("File '%s' exceeds maximum size limit of 10 MB.", file.getOriginalFilename()));
                }
                String contentType = file.getContentType();
                if (contentType == null || !ALLOWED_DOC_TYPES.contains(contentType.toLowerCase())) {
                    throw new ValidationException(String.format("File '%s' has unsupported type '%s'. Allowed types: PDF, JPEG, PNG.",
                            file.getOriginalFilename(), contentType));
                }
            }
        }

        String name = (claimantName != null && !claimantName.isBlank()) ? claimantName.trim() : claimantUser.getFullName();
        String email = (claimantEmail != null && !claimantEmail.isBlank()) ? claimantEmail.trim() : claimantUser.getEmail();
        String phone = (claimantPhone != null && !claimantPhone.isBlank()) ? claimantPhone.trim() : claimantUser.getPhoneNumber();

        GarageClaim claim = new GarageClaim();
        claim.setGarage(garage);
        claim.setClaimantUser(claimantUser);
        claim.setClaimMessage(claimMessage.trim());
        claim.setClaimantName(name);
        claim.setClaimantEmail(email);
        claim.setClaimantPhone(phone);
        claim.setBusinessRegNumber(businessRegNumber != null ? businessRegNumber.trim() : null);
        claim.setClaimStatus(ClaimStatus.PENDING);

        GarageClaim savedClaim = claimRepository.save(claim);

        // Store verification documents linked directly to this claim
        List<GarageDocument> savedDocs = new ArrayList<>();
        if (files != null && !files.isEmpty()) {
            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);
                if (file == null || file.isEmpty()) continue;

                DocumentType docType = (documentTypes != null && i < documentTypes.size() && documentTypes.get(i) != null)
                        ? documentTypes.get(i)
                        : DocumentType.OWNERSHIP_PROOF;

                String storageKey = fileStorageService.storeDocument(file, garageId);

                GarageDocument doc = new GarageDocument();
                doc.setGarage(garage);
                doc.setClaim(savedClaim);
                doc.setUploadedBy(claimantUser);
                doc.setDocumentType(docType);
                doc.setStorageKey(storageKey);
                doc.setOriginalFileName(file.getOriginalFilename() != null ? file.getOriginalFilename().trim() : "document");
                doc.setContentType(file.getContentType() != null ? file.getContentType().trim() : "application/octet-stream");
                doc.setFileSizeBytes(file.getSize());
                doc.setVerificationStatus(DocumentVerificationStatus.PENDING);

                GarageDocument persistedDoc = documentRepository.save(doc);
                savedDocs.add(persistedDoc);
            }
        }
        savedClaim.setDocuments(savedDocs);

        log.info("Claim #{} submitted by user #{} for garage #{} with {} verification document(s).",
                savedClaim.getId(), claimantUser.getId(), garageId, savedDocs.size());

        return savedClaim;
    }

    @Transactional
    public GarageClaim approveClaim(Long claimId, User adminUser, String decisionNotes) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        GarageClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage claim not found with id: " + claimId));

        if (claim.getClaimStatus() != ClaimStatus.PENDING) {
            throw new InvalidOperationException("Claim is not in PENDING status. Current status: " + claim.getClaimStatus());
        }

        // Verify that all required documents have been reviewed and verified
        List<GarageDocument> docs = documentRepository.findByClaimId(claimId);
        if (docs.isEmpty()) {
            throw new InvalidOperationException("Cannot approve claim: At least one verified proof of ownership document is required.");
        }
        boolean hasUnverifiedDocs = docs.stream()
                .anyMatch(d -> d.getVerificationStatus() != DocumentVerificationStatus.VERIFIED);
        if (hasUnverifiedDocs) {
            throw new InvalidOperationException("Cannot approve claim: All attached verification documents must be reviewed and marked VERIFIED first.");
        }

        // Lock the parent garage row to prevent race conditions
        Garage garage = garageRepository.findByIdForUpdate(claim.getGarage().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + claim.getGarage().getId()));

        if (garage.getOwner() != null) {
            throw new InvalidOperationException("Garage already has an assigned owner.");
        }

        User claimant = claim.getClaimantUser();

        // 1. Assign owner to garage atomically
        garage.setOwner(claimant);
        garageRepository.save(garage);

        // 2. Approve claim
        claim.setClaimStatus(ClaimStatus.APPROVED);
        claim.setReviewedBy(adminUser);
        claim.setReviewedAt(LocalDateTime.now());
        claim.setDecisionNotes(decisionNotes != null && !decisionNotes.isBlank()
                ? decisionNotes.trim()
                : "Approved following ownership document verification.");
        claim.setDocuments(docs);
        GarageClaim savedClaim = claimRepository.save(claim);

        // 3. Grant ROLE_GARAGE_OWNER to the claimant user atomically
        Role garageOwnerRole = roleRepository.findByName(RoleName.ROLE_GARAGE_OWNER)
                .orElseThrow(() -> new ResourceNotFoundException("Role ROLE_GARAGE_OWNER not found in database."));

        if (!userRoleRepository.existsByUserIdAndRoleId(claimant.getId(), garageOwnerRole.getId())) {
            UserRole userRole = new UserRole(claimant, garageOwnerRole);
            userRoleRepository.save(userRole);
        }

        // 4. Resolve competing claims atomically: Reject any other pending claims for this same garage
        List<GarageClaim> competingClaims = claimRepository.findByGarageIdAndClaimStatus(garage.getId(), ClaimStatus.PENDING);
        for (GarageClaim comp : competingClaims) {
            if (!comp.getId().equals(claimId)) {
                comp.setClaimStatus(ClaimStatus.REJECTED);
                comp.setReviewedBy(adminUser);
                comp.setReviewedAt(LocalDateTime.now());
                comp.setDecisionNotes("Superseded: Garage ownership verified and assigned to another claimant.");
                claimRepository.save(comp);
                log.info("Superseded competing claim #{} for garage #{}", comp.getId(), garage.getId());
            }
        }

        log.info("Claim #{} successfully approved by admin #{}. Garage #{} assigned to owner #{}.",
                claimId, adminUser.getId(), garage.getId(), claimant.getId());

        if (auditTrailService != null) {
            auditTrailService.recordAction(adminUser, "CLAIM_APPROVAL", "CLAIM", claimId, "APPROVED",
                    decisionNotes, "{\"garageId\":" + garage.getId() + ",\"claimantUserId\":" + claimant.getId() + "}");
        }

        return savedClaim;
    }

    @Transactional
    public GarageClaim rejectClaim(Long claimId, User adminUser, String decisionNotes) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }
        if (decisionNotes == null || decisionNotes.isBlank()) {
            throw new ValidationException("Rejection reason is required.");
        }

        GarageClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage claim not found with id: " + claimId));

        if (claim.getClaimStatus() != ClaimStatus.PENDING) {
            throw new InvalidOperationException("Claim is not in PENDING status. Current status: " + claim.getClaimStatus());
        }

        claim.setClaimStatus(ClaimStatus.REJECTED);
        claim.setReviewedBy(adminUser);
        claim.setReviewedAt(LocalDateTime.now());
        claim.setDecisionNotes(decisionNotes.trim());

        // Update any unreviewed pending documents on this claim
        List<GarageDocument> docs = documentRepository.findByClaimId(claimId);
        for (GarageDocument doc : docs) {
            if (doc.getVerificationStatus() == DocumentVerificationStatus.PENDING) {
                doc.setVerificationStatus(DocumentVerificationStatus.REJECTED);
                doc.setReviewedBy(adminUser);
                doc.setReviewedAt(LocalDateTime.now());
                doc.setRejectionReason(decisionNotes.trim());
                documentRepository.save(doc);
            }
        }
        claim.setDocuments(docs);

        log.info("Claim #{} rejected by admin #{}. Reason: {}", claimId, adminUser.getId(), decisionNotes);
        GarageClaim saved = claimRepository.save(claim);

        if (auditTrailService != null) {
            String actionType = decisionNotes.startsWith("Resubmission Requested:") ? "CLAIM_RESUBMISSION_REQUEST" : "CLAIM_REJECTION";
            String outcome = decisionNotes.startsWith("Resubmission Requested:") ? "RESUBMISSION_REQUESTED" : "REJECTED";
            auditTrailService.recordAction(adminUser, actionType, "CLAIM", claimId, outcome, decisionNotes,
                    "{\"garageId\":" + claim.getGarage().getId() + "}");
        }

        return saved;
    }

    @Transactional
    public GarageClaim requestResubmission(Long claimId, User adminUser, String decisionNotes) {
        if (decisionNotes == null || decisionNotes.isBlank()) {
            throw new ValidationException("Resubmission reason and requested information are required.");
        }
        return rejectClaim(claimId, adminUser, "Resubmission Requested: " + decisionNotes.trim());
    }

    @Transactional
    public GarageDocument reviewClaimDocument(Long claimId, Long documentId, DocumentVerificationStatus status, String rejectionReason, User adminUser) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin authorization required to review documents.");
        }
        if (status == null) {
            throw new ValidationException("Document verification status is required.");
        }
        if (status == DocumentVerificationStatus.REJECTED && (rejectionReason == null || rejectionReason.isBlank())) {
            throw new ValidationException("Rejection reason is required when rejecting a verification document.");
        }

        GarageDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage document not found with id: " + documentId));

        if (doc.getClaim() == null || !doc.getClaim().getId().equals(claimId)) {
            throw new InvalidOperationException("Document #" + documentId + " does not belong to claim #" + claimId);
        }

        doc.setVerificationStatus(status);
        doc.setReviewedBy(adminUser);
        doc.setReviewedAt(LocalDateTime.now());
        doc.setRejectionReason(rejectionReason != null ? rejectionReason.trim() : null);

        GarageDocument saved = documentRepository.save(doc);
        log.info("Claim #{} document #{} ({}) reviewed by admin #{}: status={}",
                claimId, documentId, doc.getDocumentType(), adminUser.getId(), status);

        if (auditTrailService != null) {
            auditTrailService.recordAction(adminUser,
                    status == DocumentVerificationStatus.VERIFIED ? "DOCUMENT_VERIFICATION" : "DOCUMENT_REJECTION",
                    "DOCUMENT", documentId, status.name(), rejectionReason,
                    "{\"claimId\":" + claimId + ",\"docType\":\"" + doc.getDocumentType() + "\"}");
        }

        return saved;
    }

    public Resource loadClaimDocumentResource(Long claimId, Long documentId, User currentUser) {
        if (currentUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to view document.");
        }

        GarageDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage document not found with id: " + documentId));

        if (doc.getClaim() == null || !doc.getClaim().getId().equals(claimId)) {
            throw new InvalidOperationException("Document #" + documentId + " does not belong to claim #" + claimId);
        }

        // Authorization check: Only claimant or Admin with permission can access
        boolean isClaimant = doc.getClaim().getClaimantUser().getId().equals(currentUser.getId());
        boolean isAdmin = userRoleRepository.findByUserId(currentUser.getId()).stream()
                .anyMatch(ur -> ur.getRole().getName() == RoleName.ROLE_ADMIN);

        if (!isClaimant && !isAdmin) {
            throw new ForbiddenOperationException("You are not authorized to view this verification document.");
        }

        return fileStorageService.loadAsResource(doc.getStorageKey());
    }

    public GarageClaim getClaimById(Long claimId) {
        GarageClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage claim not found with id: " + claimId));
        claim.setDocuments(documentRepository.findByClaimId(claimId));
        return claim;
    }

    public List<GarageClaim> getClaimsForGarage(Long garageId) {
        List<GarageClaim> claims = claimRepository.findByGarageIdOrderByCreatedAtDesc(garageId);
        for (GarageClaim c : claims) {
            c.setDocuments(documentRepository.findByClaimId(c.getId()));
        }
        return claims;
    }

    public List<GarageClaim> getClaimsByUser(Long userId) {
        List<GarageClaim> claims = claimRepository.findByClaimantUserIdOrderByCreatedAtDesc(userId);
        for (GarageClaim c : claims) {
            c.setDocuments(documentRepository.findByClaimId(c.getId()));
        }
        return claims;
    }

    public List<GarageClaim> getPendingClaimsForAdmin() {
        List<GarageClaim> claims = claimRepository.findByClaimStatusOrderByCreatedAtDesc(ClaimStatus.PENDING);
        for (GarageClaim c : claims) {
            c.setDocuments(documentRepository.findByClaimId(c.getId()));
        }
        return claims;
    }
}
