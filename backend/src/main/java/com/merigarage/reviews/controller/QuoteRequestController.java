package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageQuoteService;
import com.merigarage.reviews.service.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quote-requests")
public class QuoteRequestController {

    private final GarageQuoteService quoteService;
    private final SecurityContextService securityContextService;

    public QuoteRequestController(GarageQuoteService quoteService,
                                  SecurityContextService securityContextService) {
        this.quoteService = quoteService;
        this.securityContextService = securityContextService;
    }

    @PostMapping
    public ResponseEntity<QuoteRequestDto> createQuoteRequest(@Valid @RequestBody CreateQuoteRequest req) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        QuoteRequestDto created = quoteService.createQuoteRequest(req, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<QuoteRequestDto>> getMyQuoteRequests() {
        User currentUser = securityContextService.getRequiredCurrentUser();
        List<QuoteRequestDto> requests = quoteService.getCustomerQuoteRequests(currentUser.getId());
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/garage/{garageId}")
    public ResponseEntity<List<QuoteRequestDto>> getGarageQuoteRequests(@PathVariable Long garageId) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        List<QuoteRequestDto> requests = quoteService.getGarageQuoteRequests(garageId, currentUser);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuoteRequestDto> getQuoteRequestById(@PathVariable Long id) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        QuoteRequestDto dto = quoteService.getQuoteRequestById(id, currentUser);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{id}/owner-response")
    public ResponseEntity<QuoteRequestDto> processOwnerResponse(@PathVariable Long id,
                                                                @Valid @RequestBody QuoteOwnerResponseRequest req) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        QuoteRequestDto updated = quoteService.processOwnerResponse(id, req, currentUser);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/customer-action")
    public ResponseEntity<QuoteRequestDto> processCustomerAction(@PathVariable Long id,
                                                                 @Valid @RequestBody QuoteCustomerActionRequest req) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        QuoteRequestDto updated = quoteService.processCustomerAction(id, req, currentUser);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<QuoteRequestDto> addMessage(@PathVariable Long id,
                                                      @Valid @RequestBody QuoteMessageRequest req) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        QuoteRequestDto updated = quoteService.addMessage(id, req, currentUser);
        return ResponseEntity.ok(updated);
    }
}
