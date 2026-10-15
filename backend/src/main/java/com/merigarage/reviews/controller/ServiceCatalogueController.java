package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.security.SecurityContextService;
import com.merigarage.reviews.service.ServiceCatalogueService;
import com.merigarage.reviews.service.dto.CreateServiceRequest;
import com.merigarage.reviews.service.dto.ServiceDto;
import com.merigarage.reviews.service.dto.UpdateServiceRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ServiceCatalogueController {

    private final ServiceCatalogueService serviceCatalogueService;
    private final SecurityContextService securityContextService;

    public ServiceCatalogueController(ServiceCatalogueService serviceCatalogueService,
                                      SecurityContextService securityContextService) {
        this.serviceCatalogueService = serviceCatalogueService;
        this.securityContextService = securityContextService;
    }

    @GetMapping("/api/services")
    public ResponseEntity<List<ServiceDto>> listActiveServices() {
        List<ServiceDto> services = serviceCatalogueService.getActiveCatalogueServices().stream()
                .map(ServiceDto::fromEntity)
                .toList();
        return ResponseEntity.ok(services);
    }

    @GetMapping("/api/services/{id}")
    public ResponseEntity<ServiceDto> getActiveService(@PathVariable Integer id) {
        com.merigarage.reviews.domain.Service service = serviceCatalogueService.getServiceById(id);
        if (!Boolean.TRUE.equals(service.getIsActive())) {
            throw new ResourceNotFoundException("Service not active or not found.");
        }
        return ResponseEntity.ok(ServiceDto.fromEntity(service));
    }

    @GetMapping("/api/admin/services")
    @PreAuthorize("hasAuthority('CONTENT_MODERATION')")
    public ResponseEntity<List<ServiceDto>> listAllServicesForAdmin() {
        securityContextService.requireAdminPermission(AdminPermissionCode.CONTENT_MODERATION);
        List<ServiceDto> services = serviceCatalogueService.getAllServicesForAdmin().stream()
                .map(ServiceDto::fromEntity)
                .toList();
        return ResponseEntity.ok(services);
    }

    @PostMapping("/api/admin/services")
    @PreAuthorize("hasAuthority('CONTENT_MODERATION')")
    public ResponseEntity<ServiceDto> createService(@Valid @RequestBody CreateServiceRequest request) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CONTENT_MODERATION);
        User adminUser = securityContextService.getRequiredCurrentUser();

        com.merigarage.reviews.domain.Service created = serviceCatalogueService.createService(request, adminUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ServiceDto.fromEntity(created));
    }

    @PutMapping("/api/admin/services/{id}")
    @PreAuthorize("hasAuthority('CONTENT_MODERATION')")
    public ResponseEntity<ServiceDto> updateService(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateServiceRequest request
    ) {
        securityContextService.requireAdminPermission(AdminPermissionCode.CONTENT_MODERATION);
        User adminUser = securityContextService.getRequiredCurrentUser();

        com.merigarage.reviews.domain.Service updated = serviceCatalogueService.updateService(id, request, adminUser);
        return ResponseEntity.ok(ServiceDto.fromEntity(updated));
    }
}
