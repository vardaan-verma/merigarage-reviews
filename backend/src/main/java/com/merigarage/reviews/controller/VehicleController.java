package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.VehicleService;
import com.merigarage.reviews.service.dto.CreateVehicleRequest;
import com.merigarage.reviews.service.dto.QuoteRequestDto;
import com.merigarage.reviews.service.dto.UpdateVehicleRequest;
import com.merigarage.reviews.service.dto.VehicleDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;
    private final SecurityContextService securityContextService;

    public VehicleController(VehicleService vehicleService,
                             SecurityContextService securityContextService) {
        this.vehicleService = vehicleService;
        this.securityContextService = securityContextService;
    }

    @GetMapping
    public ResponseEntity<List<VehicleDto>> getMyVehicles() {
        User currentUser = securityContextService.getRequiredCurrentUser();
        List<VehicleDto> vehicles = vehicleService.getMyVehicles(currentUser.getId());
        return ResponseEntity.ok(vehicles);
    }

    @PostMapping
    public ResponseEntity<VehicleDto> createVehicle(@Valid @RequestBody CreateVehicleRequest request) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        VehicleDto created = vehicleService.createVehicle(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VehicleDto> updateVehicle(@PathVariable Long id,
                                                    @Valid @RequestBody UpdateVehicleRequest request) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        VehicleDto updated = vehicleService.updateVehicle(id, request, currentUser.getId());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVehicle(@PathVariable Long id) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        vehicleService.deleteVehicle(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<QuoteRequestDto>> getVehicleHistory(@PathVariable Long id) {
        User currentUser = securityContextService.getRequiredCurrentUser();
        List<QuoteRequestDto> history = vehicleService.getVehicleHistory(id, currentUser.getId());
        return ResponseEntity.ok(history);
    }
}
