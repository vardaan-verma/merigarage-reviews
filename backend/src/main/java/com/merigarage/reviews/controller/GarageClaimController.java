package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.GarageClaim;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.GarageClaimService;
import com.merigarage.reviews.service.dto.GarageClaimDto;
import com.merigarage.reviews.service.dto.SubmitClaimRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class GarageClaimController {

    private final GarageClaimService claimService;
    private final SecurityContextService securityContextService;

    public GarageClaimController(GarageClaimService claimService,
                                 SecurityContextService securityContextService) {
        this.claimService = claimService;
        this.securityContextService = securityContextService;
    }

    @PostMapping("/api/garages/{id}/claims")
    public ResponseEntity<GarageClaimDto> submitClaim(
            @PathVariable Long id,
            @Valid @RequestBody SubmitClaimRequest request
    ) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        GarageClaim claim = claimService.submitClaim(id, request.claimMessage(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(GarageClaimDto.fromEntity(claim));
    }

    @GetMapping("/api/claims/my-claims")
    public ResponseEntity<List<GarageClaimDto>> getMyClaims() {
        Long currentUserId = securityContextService.getRequiredCurrentUserId();
        List<GarageClaimDto> myClaims = claimService.getClaimsByUser(currentUserId).stream()
                .map(GarageClaimDto::fromEntity)
                .toList();
        return ResponseEntity.ok(myClaims);
    }
}
