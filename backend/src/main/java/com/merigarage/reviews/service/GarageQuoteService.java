package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageQuoteRequest;
import com.merigarage.reviews.domain.QuoteRequestMessage;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.domain.enums.QuoteRequestStatus;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageQuoteRequestRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.GarageServiceRepository;
import com.merigarage.reviews.repository.QuoteRequestMessageRepository;
import com.merigarage.reviews.service.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class GarageQuoteService {

    private final GarageQuoteRequestRepository quoteRequestRepository;
    private final QuoteRequestMessageRepository messageRepository;
    private final GarageRepository garageRepository;
    private final GarageServiceRepository garageServiceRepository;

    public GarageQuoteService(GarageQuoteRequestRepository quoteRequestRepository,
                              QuoteRequestMessageRepository messageRepository,
                              GarageRepository garageRepository,
                              GarageServiceRepository garageServiceRepository) {
        this.quoteRequestRepository = quoteRequestRepository;
        this.messageRepository = messageRepository;
        this.garageRepository = garageRepository;
        this.garageServiceRepository = garageServiceRepository;
    }

    public QuoteRequestDto createQuoteRequest(CreateQuoteRequest req, User customer) {
        if (customer == null) {
            throw new ForbiddenOperationException("Customer authentication is required to request a quote.");
        }

        Garage garage = garageRepository.findById(req.garageId())
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + req.garageId()));

        if (garage.getApprovalStatus() != GarageApprovalStatus.APPROVED) {
            throw new InvalidOperationException("Quote requests can only be submitted to approved workshops.");
        }

        List<com.merigarage.reviews.domain.GarageService> availableServices = garageServiceRepository.findByGarageIdAndIsAvailableTrue(garage.getId());
        Set<Integer> availableServiceIds = availableServices.stream()
                .map(gs -> gs.getService().getId())
                .collect(Collectors.toSet());

        for (Integer sId : req.serviceIds()) {
            if (!availableServiceIds.contains(sId)) {
                throw new InvalidOperationException("Selected service ID " + sId + " is not currently offered by this workshop.");
            }
        }

        // Calculate indicative starting price if pricing data is configured for all selected services
        BigDecimal minPriceTotal = BigDecimal.ZERO;
        boolean allHavePricing = true;
        for (Integer sId : req.serviceIds()) {
            com.merigarage.reviews.domain.GarageService gs = availableServices.stream()
                    .filter(s -> s.getService().getId().equals(sId))
                    .findFirst()
                    .orElse(null);
            if (gs == null || gs.getStartingPrice() == null) {
                allHavePricing = false;
                break;
            } else {
                minPriceTotal = minPriceTotal.add(gs.getStartingPrice());
            }
        }

        BigDecimal calculatedMin = (allHavePricing && !req.serviceIds().isEmpty()) ? minPriceTotal : null;

        // Generate unique human-readable reference number: MG-Q-YYYYMMDD-XXXX
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String referenceNumber;
        do {
            String randomPart = UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
            referenceNumber = "MG-Q-" + datePart + "-" + randomPart;
        } while (quoteRequestRepository.existsByReferenceNumber(referenceNumber));

        GarageQuoteRequest quoteRequest = new GarageQuoteRequest();
        quoteRequest.setReferenceNumber(referenceNumber);
        quoteRequest.setGarage(garage);
        quoteRequest.setCustomerUser(customer);
        quoteRequest.setVehicleType(req.vehicleType());
        quoteRequest.setVehicleMake(req.vehicleMake());
        quoteRequest.setVehicleModel(req.vehicleModel());
        quoteRequest.setVehicleYear(req.vehicleYear());
        quoteRequest.setFuelType(req.fuelType());
        quoteRequest.setRegistrationNumber(req.registrationNumber());
        quoteRequest.setOdometerReading(req.odometerReading());
        quoteRequest.setProblemDescription(req.problemDescription());
        quoteRequest.setCustomerMessage(req.customerMessage());
        quoteRequest.setContactPhone(req.contactPhone());
        quoteRequest.setContactEmail(req.contactEmail() != null && !req.contactEmail().isBlank() ? req.contactEmail() : customer.getEmail());
        quoteRequest.setPreferredDate(req.preferredDate());
        quoteRequest.setEstimatedMinPrice(calculatedMin);
        quoteRequest.setStatus(QuoteRequestStatus.PENDING);

        Set<com.merigarage.reviews.domain.Service> selectedServices = availableServices.stream()
                .filter(gs -> req.serviceIds().contains(gs.getService().getId()))
                .map(com.merigarage.reviews.domain.GarageService::getService)
                .collect(Collectors.toSet());
        quoteRequest.setServices(selectedServices);

        GarageQuoteRequest saved = quoteRequestRepository.save(quoteRequest);

        // Record initial customer message in history if provided
        if (req.customerMessage() != null && !req.customerMessage().isBlank()) {
            QuoteRequestMessage msg = new QuoteRequestMessage(saved, customer, "CUSTOMER", req.customerMessage().trim());
            messageRepository.save(msg);
            saved.getMessages().add(msg);
        }

        return QuoteRequestDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<QuoteRequestDto> getCustomerQuoteRequests(Long customerUserId) {
        return quoteRequestRepository.findByCustomerUserId(customerUserId).stream()
                .map(r -> {
                    List<QuoteRequestMessage> msgs = messageRepository.findByQuoteRequestId(r.getId());
                    r.setMessages(msgs);
                    return QuoteRequestDto.fromEntity(r);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QuoteRequestDto> getGarageQuoteRequests(Long garageId, User owner) {
        verifyWorkshopOwnership(garageId, owner);
        return quoteRequestRepository.findByGarageId(garageId).stream()
                .map(r -> {
                    List<QuoteRequestMessage> msgs = messageRepository.findByQuoteRequestId(r.getId());
                    r.setMessages(msgs);
                    return QuoteRequestDto.fromEntity(r);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public QuoteRequestDto getQuoteRequestById(Long requestId, User user) {
        GarageQuoteRequest request = quoteRequestRepository.findByIdWithDetails(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote request not found with id: " + requestId));

        boolean isCustomer = request.getCustomerUser().getId().equals(user.getId());
        boolean isOwner = request.getGarage().getOwner() != null && request.getGarage().getOwner().getId().equals(user.getId());

        if (!isCustomer && !isOwner) {
            throw new ForbiddenOperationException("You do not have permission to view this quote request.");
        }

        List<QuoteRequestMessage> messages = messageRepository.findByQuoteRequestId(requestId);
        request.setMessages(messages);
        return QuoteRequestDto.fromEntity(request);
    }

    public QuoteRequestDto processOwnerResponse(Long requestId, QuoteOwnerResponseRequest req, User owner) {
        GarageQuoteRequest request = quoteRequestRepository.findByIdWithDetails(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote request not found with id: " + requestId));

        verifyWorkshopOwnership(request.getGarage().getId(), owner);

        String action = req.action() != null ? req.action().trim().toUpperCase() : "";

        switch (action) {
            case "REVIEW" -> {
                if (request.getStatus() != QuoteRequestStatus.PENDING) {
                    throw new InvalidOperationException("Only pending quote requests can be marked under review.");
                }
                request.setStatus(QuoteRequestStatus.UNDER_REVIEW);
                if (req.ownerNotes() != null && !req.ownerNotes().isBlank()) {
                    request.setOwnerNotes(req.ownerNotes().trim());
                    QuoteRequestMessage msg = new QuoteRequestMessage(request, owner, "OWNER",
                            "Request under review. Note: " + req.ownerNotes().trim());
                    messageRepository.save(msg);
                }
            }
            case "QUOTE" -> {
                if (req.proposedQuoteAmount() == null || req.proposedQuoteAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ValidationException("A valid positive quotation amount is required.");
                }
                if (request.getStatus() != QuoteRequestStatus.PENDING &&
                        request.getStatus() != QuoteRequestStatus.UNDER_REVIEW &&
                        request.getStatus() != QuoteRequestStatus.QUOTED) {
                    throw new InvalidOperationException("Cannot quote a request in " + request.getStatus() + " status.");
                }
                request.setStatus(QuoteRequestStatus.QUOTED);
                request.setProposedQuoteAmount(req.proposedQuoteAmount());
                if (req.ownerNotes() != null && !req.ownerNotes().isBlank()) {
                    request.setOwnerNotes(req.ownerNotes().trim());
                }
                String noteText = req.ownerNotes() != null && !req.ownerNotes().isBlank() ? " Note: " + req.ownerNotes().trim() : "";
                QuoteRequestMessage msg = new QuoteRequestMessage(request, owner, "OWNER",
                        "Quotation provided: ₹" + req.proposedQuoteAmount() + "." + noteText);
                messageRepository.save(msg);
            }
            case "DECLINE" -> {
                if (request.getStatus() == QuoteRequestStatus.COMPLETED ||
                        request.getStatus() == QuoteRequestStatus.CANCELLED ||
                        request.getStatus() == QuoteRequestStatus.DECLINED) {
                    throw new InvalidOperationException("Cannot decline a request already in status: " + request.getStatus());
                }
                request.setStatus(QuoteRequestStatus.DECLINED);
                if (req.ownerNotes() != null && !req.ownerNotes().isBlank()) {
                    request.setOwnerNotes(req.ownerNotes().trim());
                }
                String noteText = req.ownerNotes() != null && !req.ownerNotes().isBlank() ? " Reason: " + req.ownerNotes().trim() : "";
                QuoteRequestMessage msg = new QuoteRequestMessage(request, owner, "OWNER",
                        "Quote request declined by garage owner." + noteText);
                messageRepository.save(msg);
            }
            case "COMPLETE" -> {
                if (request.getStatus() != QuoteRequestStatus.ACCEPTED) {
                    throw new InvalidOperationException("Only accepted requests can be marked as completed.");
                }
                request.setStatus(QuoteRequestStatus.COMPLETED);
                QuoteRequestMessage msg = new QuoteRequestMessage(request, owner, "OWNER",
                        "Service work marked as completed by garage owner.");
                messageRepository.save(msg);
            }
            default -> throw new ValidationException("Invalid owner action: " + action + ". Allowed: REVIEW, QUOTE, DECLINE, COMPLETE");
        }

        GarageQuoteRequest saved = quoteRequestRepository.save(request);
        List<QuoteRequestMessage> messages = messageRepository.findByQuoteRequestId(requestId);
        saved.setMessages(messages);
        return QuoteRequestDto.fromEntity(saved);
    }

    public QuoteRequestDto processCustomerAction(Long requestId, QuoteCustomerActionRequest req, User customer) {
        GarageQuoteRequest request = quoteRequestRepository.findByIdWithDetails(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote request not found with id: " + requestId));

        if (!request.getCustomerUser().getId().equals(customer.getId())) {
            throw new ForbiddenOperationException("Only the customer who submitted this request can respond to it.");
        }

        String action = req.action() != null ? req.action().trim().toUpperCase() : "";

        switch (action) {
            case "ACCEPT" -> {
                if (request.getStatus() != QuoteRequestStatus.QUOTED) {
                    throw new InvalidOperationException("Only a quoted request can be accepted.");
                }
                request.setStatus(QuoteRequestStatus.ACCEPTED);
                String note = req.notes() != null && !req.notes().isBlank() ? " Note: " + req.notes().trim() : "";
                QuoteRequestMessage msg = new QuoteRequestMessage(request, customer, "CUSTOMER",
                        "Customer accepted the proposed quotation of ₹" + request.getProposedQuoteAmount() + "." + note);
                messageRepository.save(msg);
            }
            case "DECLINE" -> {
                if (request.getStatus() != QuoteRequestStatus.QUOTED) {
                    throw new InvalidOperationException("Only a quoted request can be declined by customer.");
                }
                request.setStatus(QuoteRequestStatus.DECLINED);
                String note = req.notes() != null && !req.notes().isBlank() ? " Reason: " + req.notes().trim() : "";
                QuoteRequestMessage msg = new QuoteRequestMessage(request, customer, "CUSTOMER",
                        "Customer declined the proposed quotation." + note);
                messageRepository.save(msg);
            }
            case "CANCEL" -> {
                if (request.getStatus() == QuoteRequestStatus.COMPLETED ||
                        request.getStatus() == QuoteRequestStatus.CANCELLED ||
                        request.getStatus() == QuoteRequestStatus.DECLINED) {
                    throw new InvalidOperationException("Cannot cancel request already in status: " + request.getStatus());
                }
                request.setStatus(QuoteRequestStatus.CANCELLED);
                String note = req.notes() != null && !req.notes().isBlank() ? " Reason: " + req.notes().trim() : "";
                QuoteRequestMessage msg = new QuoteRequestMessage(request, customer, "CUSTOMER",
                        "Customer cancelled the quote request." + note);
                messageRepository.save(msg);
            }
            default -> throw new ValidationException("Invalid customer action: " + action + ". Allowed: ACCEPT, DECLINE, CANCEL");
        }

        GarageQuoteRequest saved = quoteRequestRepository.save(request);
        List<QuoteRequestMessage> messages = messageRepository.findByQuoteRequestId(requestId);
        saved.setMessages(messages);
        return QuoteRequestDto.fromEntity(saved);
    }

    public QuoteRequestDto addMessage(Long requestId, QuoteMessageRequest req, User user) {
        GarageQuoteRequest request = quoteRequestRepository.findByIdWithDetails(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote request not found with id: " + requestId));

        boolean isCustomer = request.getCustomerUser().getId().equals(user.getId());
        boolean isOwner = request.getGarage().getOwner() != null && request.getGarage().getOwner().getId().equals(user.getId());

        if (!isCustomer && !isOwner) {
            throw new ForbiddenOperationException("Access denied to add a message to this quote request.");
        }

        String role = isCustomer ? "CUSTOMER" : "OWNER";
        QuoteRequestMessage msg = new QuoteRequestMessage(request, user, role, req.messageText().trim());
        messageRepository.save(msg);

        List<QuoteRequestMessage> messages = messageRepository.findByQuoteRequestId(requestId);
        request.setMessages(messages);
        return QuoteRequestDto.fromEntity(request);
    }

    private void verifyWorkshopOwnership(Long garageId, User user) {
        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));
        boolean isOwner = garage.getOwner() != null && garage.getOwner().getId().equals(user.getId());
        if (!isOwner) {
            throw new ForbiddenOperationException("Only the authorized garage owner can access quote requests for this workshop.");
        }
    }
}
