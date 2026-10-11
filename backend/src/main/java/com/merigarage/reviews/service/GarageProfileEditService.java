package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageApprovalAudit;
import com.merigarage.reviews.domain.GarageProfileEdit;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AuditActionType;
import com.merigarage.reviews.domain.enums.EditStatus;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageApprovalAuditRepository;
import com.merigarage.reviews.repository.GarageProfileEditRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.service.dto.ProfileEditRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class GarageProfileEditService {

    private final GarageProfileEditRepository editRepository;
    private final GarageRepository garageRepository;
    private final GarageApprovalAuditRepository auditRepository;

    public GarageProfileEditService(GarageProfileEditRepository editRepository,
                                    GarageRepository garageRepository,
                                    GarageApprovalAuditRepository auditRepository) {
        this.editRepository = editRepository;
        this.garageRepository = garageRepository;
        this.auditRepository = auditRepository;
    }

    @Transactional
    public GarageProfileEdit submitProfileEdit(Long garageId, ProfileEditRequest request, User submittedByUser) {
        if (submittedByUser == null) {
            throw new ForbiddenOperationException("Authenticated user required to submit a profile edit proposal.");
        }
        if (request == null) {
            throw new ValidationException("Profile edit request cannot be null.");
        }

        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        // When a new proposal replaces an existing pending proposal, cancel the old proposal and retain history
        Optional<GarageProfileEdit> existingPending = editRepository.findByGarageIdAndStatus(garageId, EditStatus.PENDING);
        existingPending.ifPresent(oldProposal -> {
            oldProposal.setStatus(EditStatus.CANCELLED);
            oldProposal.setRejectionReason("Superseded by new edit proposal.");
            editRepository.saveAndFlush(oldProposal);
        });

        GarageProfileEdit proposal = new GarageProfileEdit();
        proposal.setGarage(garage);
        proposal.setSubmittedBy(submittedByUser);
        proposal.setProposedName(request.proposedName().trim());
        proposal.setProposedDescription(request.proposedDescription());
        proposal.setProposedAddressLine1(request.proposedAddressLine1().trim());
        proposal.setProposedAddressLine2(request.proposedAddressLine2());
        proposal.setProposedCity(request.proposedCity().trim());
        proposal.setProposedState(request.proposedState().trim());
        proposal.setProposedPostalCode(request.proposedPostalCode().trim());
        proposal.setProposedPhoneNumber(request.proposedPhoneNumber().trim());
        proposal.setProposedEmail(request.proposedEmail());
        proposal.setProposedWebsiteUrl(request.proposedWebsiteUrl());
        proposal.setProposedLatitude(request.proposedLatitude());
        proposal.setProposedLongitude(request.proposedLongitude());
        proposal.setStatus(EditStatus.PENDING);

        return editRepository.save(proposal);
    }

    @Transactional
    public GarageProfileEdit approveProfileEdit(Long editId, User adminUser, String decisionNotes) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        GarageProfileEdit edit = editRepository.findById(editId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile edit proposal not found with id: " + editId));

        if (edit.getStatus() != EditStatus.PENDING) {
            throw new InvalidOperationException("Profile edit proposal is not in PENDING status. Current status: " + edit.getStatus());
        }

        Garage garage = edit.getGarage();

        // Atomically apply staged edits to live garage
        garage.setName(edit.getProposedName());
        garage.setDescription(edit.getProposedDescription());
        garage.setAddressLine1(edit.getProposedAddressLine1());
        garage.setAddressLine2(edit.getProposedAddressLine2());
        garage.setCity(edit.getProposedCity());
        garage.setState(edit.getProposedState());
        garage.setPostalCode(edit.getProposedPostalCode());
        garage.setPhoneNumber(edit.getProposedPhoneNumber());
        garage.setEmail(edit.getProposedEmail());
        garage.setWebsiteUrl(edit.getProposedWebsiteUrl());
        garage.setLatitude(edit.getProposedLatitude());
        garage.setLongitude(edit.getProposedLongitude());

        Garage savedGarage = garageRepository.save(garage);

        // Update edit proposal status
        edit.setStatus(EditStatus.APPROVED);
        edit.setReviewedBy(adminUser);
        edit.setReviewedAt(LocalDateTime.now());
        GarageProfileEdit savedEdit = editRepository.save(edit);

        // Record audit
        GarageApprovalAudit audit = new GarageApprovalAudit(
                savedGarage,
                AuditActionType.PROFILE_EDIT_APPROVED,
                adminUser,
                savedGarage.getApprovalStatus().name(),
                savedGarage.getApprovalStatus().name(),
                savedGarage.getIsVerified(),
                savedGarage.getIsVerified()
        );
        audit.setReferenceEdit(savedEdit);
        audit.setDecisionNotes(decisionNotes);
        auditRepository.save(audit);

        return savedEdit;
    }

    @Transactional
    public GarageProfileEdit rejectProfileEdit(Long editId, User adminUser, String rejectionReason) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required.");
        }

        GarageProfileEdit edit = editRepository.findById(editId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile edit proposal not found with id: " + editId));

        if (edit.getStatus() != EditStatus.PENDING) {
            throw new InvalidOperationException("Profile edit proposal is not in PENDING status. Current status: " + edit.getStatus());
        }

        edit.setStatus(EditStatus.REJECTED);
        edit.setReviewedBy(adminUser);
        edit.setReviewedAt(LocalDateTime.now());
        edit.setRejectionReason(rejectionReason);
        GarageProfileEdit savedEdit = editRepository.save(edit);

        GarageApprovalAudit audit = new GarageApprovalAudit(
                edit.getGarage(),
                AuditActionType.PROFILE_EDIT_REJECTED,
                adminUser,
                edit.getGarage().getApprovalStatus().name(),
                edit.getGarage().getApprovalStatus().name(),
                edit.getGarage().getIsVerified(),
                edit.getGarage().getIsVerified()
        );
        audit.setReferenceEdit(savedEdit);
        audit.setDecisionNotes(rejectionReason);
        auditRepository.save(audit);

        return savedEdit;
    }

    public List<GarageProfileEdit> getEditsForGarage(Long garageId) {
        return editRepository.findByGarageIdOrderByCreatedAtDesc(garageId);
    }

    public List<GarageProfileEdit> getPendingEditsForAdmin() {
        return editRepository.findByStatus(EditStatus.PENDING);
    }

    public Optional<GarageProfileEdit> getPendingEditForGarage(Long garageId) {
        return editRepository.findByStatus(EditStatus.PENDING).stream()
                .filter(e -> e.getGarage().getId().equals(garageId))
                .findFirst();
    }
}
